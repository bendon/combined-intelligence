"""Credential acquisition for Cloud TPU API.

Wraps google-auth's standard discovery chain so we get the same long-lived
auth as the PowerShell scripts but without the .NET / PKCS#8 pain. Priority:

    1. Service-account JSON key on disk (if `key_file` is given or default
       `infra/gcp/service-account.json` exists)  - long-lived, recommended.
    2. Application Default Credentials (e.g. `gcloud auth application-default
       login`, or the GCE/TPU metadata server when running on a Google VM).

We bring our own httpx-based transport for google-auth so the only HTTP
client in the backend is httpx (no transitive `requests` dependency). The
returned `AuthedSession` injects a fresh access token per request; google-auth
caches and refreshes the underlying token, so multi-hour watchdog runs are
safe with no manual rotation.
"""
from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

import httpx
import google.auth
from google.auth.transport import Request as GoogleAuthRequest, Response as GoogleAuthResponse
from google.oauth2 import service_account

log = logging.getLogger(__name__)

SCOPES = ["https://www.googleapis.com/auth/cloud-platform"]


# ── httpx-based google-auth transport ──────────────────────────────────────
class _HttpxResponse(GoogleAuthResponse):
    """Adapts an `httpx.Response` to the google-auth Response interface."""

    def __init__(self, resp: httpx.Response):
        self._resp = resp

    @property
    def status(self) -> int:
        return self._resp.status_code

    @property
    def headers(self) -> dict[str, str]:
        return dict(self._resp.headers)

    @property
    def data(self) -> bytes:
        return self._resp.content


class HttpxRequest(GoogleAuthRequest):
    """Minimal `google.auth.transport.Request` implementation backed by httpx.

    Avoids dragging `requests` into the backend's transitive dep tree just
    to refresh access tokens. google-auth calls this with body=str|bytes
    and small timeouts  - straightforward to translate.
    """

    def __init__(self, client: httpx.Client | None = None, timeout: float = 60.0):
        self._client = client or httpx.Client(timeout=timeout)
        self._owns_client = client is None

    def __call__(
        self,
        url: str,
        method: str = "GET",
        body: bytes | str | None = None,
        headers: dict[str, str] | None = None,
        timeout: float | int | None = None,
        **kwargs: Any,
    ) -> _HttpxResponse:
        content = body
        if isinstance(content, str):
            content = content.encode("utf-8")
        resp = self._client.request(
            method=method,
            url=url,
            content=content,
            headers=headers or {},
            timeout=timeout if timeout is not None else 60.0,
        )
        return _HttpxResponse(resp)

    def close(self) -> None:
        if self._owns_client:
            self._client.close()


def load_credentials(key_file: Path | None = None):
    """Return a google-auth Credentials object (typed loosely as Any here
    because the SA and ADC paths produce different concrete classes)."""
    if key_file is not None:
        if not key_file.exists():
            raise FileNotFoundError(
                f"Service-account key file not found: {key_file}. "
                f"Set GCP_SERVICE_ACCOUNT_KEY_FILE in infra/.env, "
                f"or drop the JSON at infra/gcp/service-account.json."
            )
        creds = service_account.Credentials.from_service_account_file(
            str(key_file), scopes=SCOPES
        )
        log.info("Loaded service-account credentials from %s", key_file)
        return creds

    # No explicit key  - try Application Default Credentials. Works on GCE/TPU
    # VMs (metadata server), on dev machines after `gcloud auth
    # application-default login`, and in Cloud Run/Functions/etc.
    creds, project = google.auth.default(scopes=SCOPES)
    log.info("Loaded application-default credentials (auto-detected project=%s)", project)
    return creds


class AuthedSession:
    """httpx.Client wrapper that injects a fresh Bearer token per request.

    google-auth caches the access token internally and refreshes it ~5 min
    before expiry, so this is safe for multi-hour watchdog runs.
    """

    def __init__(self, key_file: Path | None = None, timeout: float = 60.0):
        self._creds = load_credentials(key_file)
        self._client = httpx.Client(timeout=timeout)
        # google-auth needs a Request transport for the refresh handshake.
        # We pass it our own httpx-based one so we don't need `requests`.
        self._req = HttpxRequest(self._client)

    def _auth_headers(self) -> dict[str, str]:
        if not self._creds.valid:
            self._creds.refresh(self._req)
        return {"Authorization": f"Bearer {self._creds.token}"}

    def get(self, url: str, **kwargs: Any) -> httpx.Response:
        merged_headers = dict(kwargs.pop("headers", {}))
        merged_headers.update(self._auth_headers())
        return self._client.get(url, headers=merged_headers, **kwargs)

    def post(self, url: str, **kwargs: Any) -> httpx.Response:
        merged_headers = dict(kwargs.pop("headers", {}))
        merged_headers.update(self._auth_headers())
        return self._client.post(url, headers=merged_headers, **kwargs)

    def delete(self, url: str, **kwargs: Any) -> httpx.Response:
        merged_headers = dict(kwargs.pop("headers", {}))
        merged_headers.update(self._auth_headers())
        return self._client.delete(url, headers=merged_headers, **kwargs)

    def close(self) -> None:
        self._client.close()

    def __enter__(self) -> "AuthedSession":
        return self

    def __exit__(self, *exc: Any) -> None:
        self.close()
