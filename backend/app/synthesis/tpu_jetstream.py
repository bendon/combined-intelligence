"""On-demand Spot-TPU inference via JetStream.

This is the TPU equivalent of `app.synthesis.gcp` (which starts/stops the
Ollama Compute VM). The pattern Celery tasks should use is identical to the
existing Ollama flow:

    from app.synthesis.tpu_jetstream import (
        ensure_tpu_up, release_tpu_if_we_started_it, jetstream_generate,
    )

    started_here = False
    try:
        endpoint, started_here = ensure_tpu_up()
        result = jetstream_generate(endpoint, prompt)
    finally:
        if started_here:
            release_tpu_if_we_started_it()

The control-plane watchdog (`backend/app/tpu/`) handles the daily lease
window; this module just brings the node up if it's missing when a task
arrives mid-day, then tears it down afterwards so the budget isn't burnt
while idle.

Why a separate module from `app.synthesis.gcp`?
  * `gcp.py` uses the google-cloud-compute SDK (Compute Engine API).
    TPUs live in the Cloud TPU API and we already have a hand-rolled
    client at `app.tpu.client` that uses the same auth path - reusing
    it avoids pulling another SDK + duplicate credential logic.
  * The Ollama VM is one always-defined instance you start/stop. The
    Spot TPU is sometimes MISSING (the watchdog deleted it overnight)
    so the bring-up is `create_node` not `start_node` - different op
    name, different wait shape.
"""
from __future__ import annotations

import logging
import time
import httpx

from app.config import get_settings
from app.tpu.config import TpuConfig
from app.tpu.manager import TpuManager

log = logging.getLogger(__name__)

# ── Tunables  - kept in code (not env) because they're plumbing, not config ─
_CREATE_TIMEOUT_S = 1200        # 20min: model download dominates first boot
_HEALTH_POLL_INTERVAL_S = 10
_HEALTH_PATHS = ("/health", "/")  # JetStream exposes both depending on version


def _load_tpu_config() -> TpuConfig:
    """Cached TPU config. The TpuConfig.load() call hits the filesystem
    (infra/.env) so we don't want to repeat it inside a hot loop. But since
    Celery workers are long-lived processes and config rarely changes mid-
    run, the simple cache via the module-level singleton is sufficient.
    """
    global _CFG
    try:
        return _CFG
    except NameError:
        pass
    _CFG = TpuConfig.load()
    return _CFG


def tpu_state() -> str:
    """Return current TPU lifecycle state, or "MISSING" if no node exists.

    Use this when you want to inspect without side effects (e.g. for a
    /health endpoint that reports whether synthesis is currently warm).
    """
    cfg = _load_tpu_config()
    with TpuManager(cfg) as mgr:
        return mgr.get_state()


def tpu_endpoint() -> str | None:
    """If the TPU is already up, return its JetStream URL. None otherwise."""
    cfg = _load_tpu_config()
    with TpuManager(cfg) as mgr:
        return mgr.get_endpoint()


def ensure_tpu_up(
    *,
    create_timeout_s: int = _CREATE_TIMEOUT_S,
    health_timeout_s: int = _CREATE_TIMEOUT_S,
) -> tuple[str, bool]:
    """Make sure a TPU node is READY and JetStream is responding.

    Returns:
        (endpoint, started_here)
        - endpoint: HTTP base URL the backend should hit (e.g.
          "http://34.x.x.x:9000")
        - started_here: True if we created the node (and therefore should
          tear it down), False if it was already up (someone else  - the
          watchdog or a previous task  - owns the lifecycle).

    Raises RuntimeError if we can't bring it up within the timeouts.
    """
    cfg = _load_tpu_config()
    started_here = False

    with TpuManager(cfg) as mgr:
        state = mgr.get_state()
        log.info("ensure_tpu_up: current state=%s", state)

        if state == "MISSING":
            log.info("ensure_tpu_up: creating TPU node (this can take 10-20min)")
            # `wait=True` waits for the TPU API operation to finish (node
            # transitions out of CREATING). Note this does NOT wait for the
            # startup-script to finish installing JetStream  - that's what
            # the health-poll below is for.
            mgr.create(spot=True, wait=True)
            started_here = True
            state = mgr.get_state()
            log.info("ensure_tpu_up: post-create state=%s", state)

        # If the watchdog is mid-recovery (CREATING/STARTING) we just wait
        # for it - no need to step on it.
        deadline = time.monotonic() + create_timeout_s
        while state not in {"READY"}:
            if time.monotonic() > deadline:
                raise RuntimeError(
                    f"TPU did not reach READY within {create_timeout_s}s (last state={state})"
                )
            if state in {"PREEMPTED", "TERMINATED", "FAILED", "STOPPED"}:
                # Spot got pulled out from under us before we could use it.
                # The watchdog will failover on its next tick; let it.
                raise RuntimeError(
                    f"TPU is in unrecoverable state {state} - watchdog should retry shortly"
                )
            time.sleep(15)
            state = mgr.get_state()

        endpoint = mgr.get_endpoint()
        if not endpoint:
            raise RuntimeError(
                "TPU is READY but has no external IP - check TPU_ENABLE_EXTERNAL_IPS=true "
                "in infra/.env and the firewall rule from tpu-vm/README.md."
            )

    # Wait for the JetStream HTTP server inside the VM to respond. The TPU
    # being READY only means the chip is allocated  - the model checkpoint
    # could still be downloading or the server still loading params.
    _wait_for_jetstream(endpoint, timeout_s=health_timeout_s)
    return endpoint, started_here


def release_tpu_if_we_started_it(started_here: bool) -> None:
    """Counterpart to the Ollama pattern's `stop_vm()` call in `finally`.

    Only deletes if we created it ourselves. If the watchdog has the node
    on its multi-zone rotation, we leave it alone  - tearing it down out
    from under the watchdog confuses both of us.
    """
    if not started_here:
        return
    cfg = _load_tpu_config()
    with TpuManager(cfg) as mgr:
        try:
            mgr.delete(wait=False)
            log.info("release_tpu: delete issued for %s @ %s", cfg.node_id, cfg.zone)
        except Exception:
            log.exception("release_tpu: delete failed - run `python -m app.tpu delete` manually")


def _wait_for_jetstream(endpoint: str, *, timeout_s: int) -> None:
    """Poll JetStream's health endpoint until it returns 200."""
    deadline = time.monotonic() + timeout_s
    last_err: Exception | None = None
    while time.monotonic() < deadline:
        for path in _HEALTH_PATHS:
            try:
                r = httpx.get(f"{endpoint}{path}", timeout=5)
                if r.status_code < 500:
                    log.info("JetStream ready at %s (status=%d)", endpoint, r.status_code)
                    return
            except Exception as e:
                last_err = e
        time.sleep(_HEALTH_POLL_INTERVAL_S)
    raise RuntimeError(
        f"JetStream did not become healthy at {endpoint} within {timeout_s}s "
        f"(last error: {last_err!r})"
    )


def jetstream_generate(
    endpoint: str,
    prompt: str,
    *,
    max_tokens: int = 1024,
    temperature: float = 0.2,
    timeout_s: int = 600,
) -> str:
    """Send a prompt to MaxText/JetStream's HTTP server, return raw text.

    JetStream's wire format isn't a frozen API - the canonical path right
    now is /generate (MaxEngine server) and the request body shape matches
    MaxText's reference client. If you swap MaxText for vLLM-TPU or another
    serving stack, edit just this function: the rest of the flow doesn't
    care.
    """
    body = {
        "prompt": prompt,
        "max_tokens": max_tokens,
        "temperature": temperature,
    }
    r = httpx.post(f"{endpoint}/generate", json=body, timeout=timeout_s)
    r.raise_for_status()
    data = r.json()
    # MaxText returns {"completion": "..."} - adapt here if your serving
    # layer differs (e.g. OpenAI-style "choices": [{"text": "..."}]).
    if isinstance(data, dict) and "completion" in data:
        return data["completion"]
    if isinstance(data, dict) and "text" in data:
        return data["text"]
    # Fallback: stringify so callers see *something* useful in logs even
    # if the schema is different from what we expected.
    return str(data)
