"""Backend-agnostic LLM call abstraction for synthesis tasks.

Two implementations behind one tiny interface:

  ollama_vm       Existing path. Starts the Compute VM, pulls Ollama,
                  calls /api/generate, stops the VM in finally.

  tpu_jetstream   New path. Brings up a Spot TPU (if MISSING), waits for
                  JetStream's HTTP server, posts to /generate, releases
                  the TPU in finally (only if WE created it - if the
                  daily watchdog has it warm, we share its lease instead).

Picked by `SYNTHESIS_BACKEND` in backend/.env. See `app.config.Settings`.

Usage from a Celery task (mirrors the existing Ollama flow):

    from app.synthesis.llm_backend import select_backend

    backend = select_backend()
    started_here = False
    try:
        started_here = backend.ensure_up()
        json_text = backend.generate(prompt)
    finally:
        backend.release(started_here)

The interface is deliberately minimal: ensure_up / generate / release.
JSON parsing, retry policy, prompt templating - all live in tasks.py
where they did before.
"""
from __future__ import annotations

import json
import logging
import time
from typing import Protocol

import httpx

from app.config import get_settings

log = logging.getLogger(__name__)


class LlmBackend(Protocol):
    name: str

    def ensure_up(self) -> bool:
        """Bring the underlying compute up. Return True if WE started it
        (and therefore should release in `finally`), False if it was
        already running and someone else owns the lifecycle."""
        ...

    def generate(self, prompt: str) -> str:
        """Send the prompt, return the raw text response. Caller does
        JSON-parsing / fence-stripping (kept centralised in tasks.py)."""
        ...

    def release(self, started_here: bool) -> None:
        """Tear down the compute iff `started_here` is True."""
        ...


# ── Ollama on a Compute VM (existing default) ──────────────────────────────

class _OllamaVmBackend:
    name = "ollama_vm"

    def __init__(self) -> None:
        self._settings = get_settings()

    def ensure_up(self) -> bool:
        # Imported lazily so test environments without google-cloud-compute
        # installed can still import this module.
        from app.synthesis.gcp import start_vm, stop_vm, vm_status  # noqa: F401

        status = vm_status()
        if status == "RUNNING":
            return False
        log.info("ollama_vm: starting VM (was %s)", status)
        start_vm()
        self._wait_ready()
        return True

    def generate(self, prompt: str) -> str:
        s = self._settings
        r = httpx.post(
            f"{s.ollama_base_url}/api/generate",
            json={
                "model":   s.ollama_model,
                "prompt":  prompt,
                "stream":  False,
                "options": {"temperature": 0.2},
            },
            timeout=600,
        )
        r.raise_for_status()
        return r.json().get("response", "")

    def release(self, started_here: bool) -> None:
        if not started_here:
            return
        from app.synthesis.gcp import stop_vm
        try:
            stop_vm()
        except Exception:
            log.warning("ollama_vm: stop_vm failed - check VM state manually")

    def _wait_ready(self, retries: int = 24, interval: int = 5) -> None:
        s = self._settings
        for _ in range(retries):
            try:
                r = httpx.get(f"{s.ollama_base_url}/api/tags", timeout=5)
                if r.status_code == 200:
                    return
            except Exception:
                pass
            time.sleep(interval)
        raise RuntimeError("Ollama did not become ready in time")


# ── JetStream on a Spot TPU (new path) ─────────────────────────────────────

class _TpuJetstreamBackend:
    name = "tpu_jetstream"

    def __init__(self) -> None:
        self._settings = get_settings()
        self._endpoint: str | None = None  # populated by ensure_up()

    def ensure_up(self) -> bool:
        # Honour the override if set - useful when JetStream lives behind a
        # static LB IP (multi-host pods) instead of the TPU's ephemeral IP.
        override = self._settings.jetstream_base_url
        if override:
            self._endpoint = override.rstrip("/")
            log.info("tpu_jetstream: using configured endpoint %s", self._endpoint)
            return False  # not our lifecycle to manage

        from app.synthesis.tpu_jetstream import ensure_tpu_up
        endpoint, started_here = ensure_tpu_up()
        self._endpoint = endpoint.rstrip("/")
        return started_here

    def generate(self, prompt: str) -> str:
        if not self._endpoint:
            raise RuntimeError("tpu_jetstream: ensure_up() was not called first")
        s = self._settings
        from app.synthesis.tpu_jetstream import jetstream_generate
        return jetstream_generate(
            self._endpoint,
            prompt,
            max_tokens=s.jetstream_max_tokens,
            temperature=s.jetstream_temperature,
        )

    def release(self, started_here: bool) -> None:
        if not started_here:
            return
        from app.synthesis.tpu_jetstream import release_tpu_if_we_started_it
        release_tpu_if_we_started_it(started_here=True)


# ── Selector ────────────────────────────────────────────────────────────────

_BACKENDS: dict[str, type[LlmBackend]] = {
    "ollama_vm":     _OllamaVmBackend,
    "tpu_jetstream": _TpuJetstreamBackend,
}


def select_backend() -> LlmBackend:
    """Return a fresh backend instance per call.

    We instantiate on every call rather than caching because Celery tasks
    are stateless and a stale endpoint URL after a TPU recreate would be
    a hard-to-debug bug. Construction is cheap (no I/O).
    """
    s = get_settings()
    key = (s.synthesis_backend or "ollama_vm").lower()
    cls = _BACKENDS.get(key)
    if cls is None:
        raise ValueError(
            f"Unknown SYNTHESIS_BACKEND={s.synthesis_backend!r}. "
            f"Valid: {sorted(_BACKENDS.keys())}"
        )
    return cls()


def parse_llm_json(raw: str) -> dict:
    """Strip the markdown fences that Ollama / JetStream sometimes wrap
    JSON in, then parse. Shared so both backends behave the same to callers.
    """
    raw = (raw or "").strip()
    if raw.startswith("```"):
        # ```json\n{...}\n```  or  ```\n{...}\n```
        raw = raw.split("```", 2)[1]
        if raw.startswith("json"):
            raw = raw[4:]
    return json.loads(raw.strip())
