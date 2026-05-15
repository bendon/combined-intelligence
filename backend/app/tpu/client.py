"""Thin REST client for the Cloud TPU v2 API.

We deliberately don't use `google-cloud-tpu` SDK  - the API surface we need is
five endpoints, the JSON shape matches our existing PowerShell tooling 1:1,
and dropping a fat dependency keeps the CLI snappy for systemd timers.
"""
from __future__ import annotations

import logging
import time
from typing import Any

from .auth import AuthedSession

log = logging.getLogger(__name__)

API_BASE = "https://tpu.googleapis.com/v2"


class TpuApiError(RuntimeError):
    """Raised for non-2xx responses. Includes the parsed error body so the
    watchdog can match on `.code` / `.status` for failover decisions."""

    def __init__(self, status_code: int, body: dict[str, Any] | str, url: str):
        self.status_code = status_code
        self.body = body
        self.url = url
        err = body.get("error", {}) if isinstance(body, dict) else {}
        self.api_status: str = err.get("status", "") if isinstance(err, dict) else ""
        self.api_message: str = err.get("message", "") if isinstance(err, dict) else str(body)
        super().__init__(f"[{status_code} {self.api_status}] {self.api_message}  ({url})")


def _check(resp, url: str) -> dict[str, Any]:
    if 200 <= resp.status_code < 300:
        if not resp.content:
            return {}
        return resp.json()
    # Try to parse the structured error; if that fails, fall back to text.
    body: dict[str, Any] | str
    try:
        body = resp.json()
    except Exception:
        body = resp.text
    raise TpuApiError(resp.status_code, body, url)


class TpuClient:
    """REST client. All methods are synchronous  - the CLI doesn't benefit
    from async, and systemd timers prefer simple processes."""

    def __init__(self, session: AuthedSession, project: str):
        self._s = session
        self._project = project

    # ── locations / discovery ────────────────────────────────────────────
    def list_locations(self) -> list[dict[str, Any]]:
        url = f"{API_BASE}/projects/{self._project}/locations?pageSize=500"
        return _check(self._s.get(url), url).get("locations", [])

    def list_accelerator_types(self, zone: str) -> list[dict[str, Any]]:
        url = f"{API_BASE}/projects/{self._project}/locations/{zone}/acceleratorTypes?pageSize=500"
        return _check(self._s.get(url), url).get("acceleratorTypes", [])

    def list_runtime_versions(self, zone: str) -> list[dict[str, Any]]:
        url = f"{API_BASE}/projects/{self._project}/locations/{zone}/runtimeVersions?pageSize=500"
        return _check(self._s.get(url), url).get("runtimeVersions", [])

    # ── nodes ────────────────────────────────────────────────────────────
    def get_node(self, zone: str, node_id: str) -> dict[str, Any] | None:
        """Return node JSON, or None if it doesn't exist (404)."""
        url = f"{API_BASE}/projects/{self._project}/locations/{zone}/nodes/{node_id}"
        try:
            return _check(self._s.get(url), url)
        except TpuApiError as e:
            if e.status_code == 404:
                return None
            raise

    def create_node(
        self,
        *,
        zone: str,
        node_id: str,
        accelerator_type: str,
        runtime_version: str,
        spot: bool = True,
        enable_external_ips: bool = True,
        startup_script: str | None = None,
        metadata: dict[str, str] | None = None,
        service_account: str = "",
        tags: list[str] | None = None,
        wait: bool = True,
        wait_timeout_s: int = 900,
    ) -> dict[str, Any]:
        url = (
            f"{API_BASE}/projects/{self._project}/locations/{zone}/nodes"
            f"?nodeId={node_id}"
        )
        body: dict[str, Any] = {
            "acceleratorType": accelerator_type,
            "runtimeVersion": runtime_version,
            "schedulingConfig": {"spot": spot} if spot else {},
        }

        # ── Network: external IP + tags for the firewall to target ──────────
        net_cfg: dict[str, Any] = {}
        if enable_external_ips:
            # An empty accessConfig entry tells the API to provision an
            # ephemeral external IP for each worker  - matches the PS1 default.
            net_cfg["enableExternalIps"] = True
        if tags:
            # Note: the v2 TPU API treats `tags` as a top-level node field, not
            # nested under networkConfig. We set it below.
            pass
        if net_cfg:
            body["networkConfig"] = net_cfg
        if tags:
            body["tags"] = list(tags)

        # ── Metadata: startup-script + arbitrary KV pairs the workload reads ─
        # Cloud TPU's v2 `metadata` field is a flat string-string map. The
        # special key "startup-script" is executed once by `google-startup-scripts`
        # on the TPU VM (same convention as Compute Engine).
        meta_payload: dict[str, str] = {}
        if metadata:
            meta_payload.update({k: str(v) for k, v in metadata.items()})
        if startup_script is not None:
            meta_payload["startup-script"] = startup_script
        if meta_payload:
            body["metadata"] = meta_payload

        # ── Service account: the identity the TPU VM impersonates ──────────
        if service_account:
            body["serviceAccount"] = {
                "email": service_account,
                # cloud-platform scope is needed for the VM to read GCS,
                # write logs, fetch secrets, etc. Tighten to specific scopes
                # if you have a security review requirement.
                "scope": ["https://www.googleapis.com/auth/cloud-platform"],
            }

        log.info(
            "create_node zone=%s node=%s accel=%s runtime=%s spot=%s "
            "startup_script=%s metadata_keys=%s sa=%s tags=%s",
            zone, node_id, accelerator_type, runtime_version, spot,
            "yes" if startup_script else "no",
            sorted(meta_payload.keys()) if meta_payload else [],
            service_account or "<default>",
            tags or [],
        )
        op = _check(self._s.post(url, json=body), url)
        if not wait:
            return op
        return self._wait_op(op, wait_timeout_s)

    def delete_node(
        self,
        *,
        zone: str,
        node_id: str,
        wait: bool = True,
        wait_timeout_s: int = 600,
    ) -> dict[str, Any] | None:
        url = f"{API_BASE}/projects/{self._project}/locations/{zone}/nodes/{node_id}"
        try:
            op = _check(self._s.delete(url), url)
        except TpuApiError as e:
            if e.status_code == 404:
                return None  # already gone  - fine
            raise
        if not wait:
            return op
        return self._wait_op(op, wait_timeout_s)

    # ── helpers ──────────────────────────────────────────────────────────
    @staticmethod
    def external_ips(node: dict[str, Any]) -> list[str]:
        """Extract worker external IPs from a node JSON.

        Node shape (excerpt):
          { "networkEndpoints": [
              { "ipAddress": "10.x.x.x",
                "accessConfig": { "externalIp": "34.x.x.x" } },
              ...
          ] }
        Returns the list of externalIps (empty if external IPs disabled).
        """
        out: list[str] = []
        for ep in node.get("networkEndpoints", []) or []:
            cfg = ep.get("accessConfig") or {}
            ip = cfg.get("externalIp")
            if ip:
                out.append(ip)
        return out

    @staticmethod
    def internal_ips(node: dict[str, Any]) -> list[str]:
        """Extract worker internal IPs (useful for in-VPC traffic)."""
        return [
            ep.get("ipAddress")
            for ep in node.get("networkEndpoints", []) or []
            if ep.get("ipAddress")
        ]

    # ── operations ───────────────────────────────────────────────────────
    def _wait_op(self, op: dict[str, Any], timeout_s: int) -> dict[str, Any]:
        op_name = op.get("name")
        if not op_name:
            return op  # nothing to wait for
        op_url = f"https://tpu.googleapis.com/v2/{op_name}"
        deadline = time.monotonic() + timeout_s
        while time.monotonic() < deadline:
            resp = _check(self._s.get(op_url), op_url)
            if resp.get("done"):
                if resp.get("error"):
                    err = resp["error"]
                    raise TpuApiError(
                        status_code=int(err.get("code", 0)),
                        body={"error": err},
                        url=op_url,
                    )
                return resp
            time.sleep(8)
        raise TimeoutError(f"TPU operation {op_name} did not complete in {timeout_s}s")
