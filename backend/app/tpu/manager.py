"""High-level TPU operations: get / create / delete / recreate / survey.

Wraps `TpuClient` with the conveniences the CLI and watchdog need (default
zone from config, consistent error handling, structured return values).
"""
from __future__ import annotations

import fnmatch
import logging
from typing import Any

from .auth import AuthedSession
from .client import TpuApiError, TpuClient
from .config import Candidate, TpuConfig

log = logging.getLogger(__name__)


class TpuManager:
    def __init__(self, config: TpuConfig):
        self._cfg = config
        self._session = AuthedSession(key_file=config.service_account_key_file)
        self._client = TpuClient(self._session, project=config.project)

    @property
    def config(self) -> TpuConfig:
        return self._cfg

    @property
    def client(self) -> TpuClient:
        return self._client

    def close(self) -> None:
        self._session.close()

    def __enter__(self) -> "TpuManager":
        return self

    def __exit__(self, *exc: Any) -> None:
        self.close()

    # ── node ops ─────────────────────────────────────────────────────────
    def get_state(self, *, zone: str | None = None, node_id: str | None = None) -> str:
        """Return lifecycle state, or "MISSING" if the node doesn't exist."""
        node = self._client.get_node(
            zone=zone or self._cfg.zone,
            node_id=node_id or self._cfg.node_id,
        )
        if node is None:
            return "MISSING"
        return node.get("state", "UNKNOWN")

    def get_node(self, *, zone: str | None = None, node_id: str | None = None) -> dict[str, Any] | None:
        """Return the full node JSON, or None if it doesn't exist."""
        return self._client.get_node(
            zone=zone or self._cfg.zone,
            node_id=node_id or self._cfg.node_id,
        )

    def get_endpoint(
        self,
        *,
        zone: str | None = None,
        node_id: str | None = None,
        prefer_internal: bool = False,
        port: int | None = None,
    ) -> str | None:
        """Return the HTTP URL the backend should hit (e.g. JetStream).

        Returns None if the node doesn't exist or doesn't have a reachable IP.
        Picks the first worker's IP - single-host TPUs (v6e-1, v5litepod-1)
        have exactly one worker anyway. For multi-host pods you'll want to
        front them with a load balancer; call `get_node()` and pick yourself.
        """
        node = self.get_node(zone=zone, node_id=node_id)
        if node is None:
            return None
        ips = (TpuClient.internal_ips(node) if prefer_internal
               else TpuClient.external_ips(node))
        if not ips:
            return None
        return f"http://{ips[0]}:{port or self._cfg.jetstream_port}"

    def create(
        self,
        *,
        zone: str | None = None,
        node_id: str | None = None,
        accelerator_type: str | None = None,
        runtime_version: str | None = None,
        spot: bool = True,
        wait: bool = True,
        deploy_workload: bool = True,
        extra_metadata: dict[str, str] | None = None,
    ) -> dict[str, Any]:
        """Create the TPU node, optionally also pushing the workload bootstrap.

        When `deploy_workload=True` (default), this loads the startup script
        from `config.startup_script_path`, merges `config.workload_metadata`
        with any `extra_metadata` passed here, and attaches the workload's
        service account + network tags to the node. Set deploy_workload=False
        for bare lifecycle calls (smoke tests, ad-hoc debugging) so you get a
        plain TPU with no auto-installer.
        """
        startup_script: str | None = None
        metadata: dict[str, str] = {}
        service_account = ""
        tags: list[str] = []

        if deploy_workload:
            if self._cfg.startup_script_path and self._cfg.startup_script_path.exists():
                try:
                    startup_script = self._cfg.startup_script_path.read_text(encoding="utf-8")
                except OSError as e:
                    log.warning("Could not read startup script %s: %s  - skipping.",
                                self._cfg.startup_script_path, e)
            elif self._cfg.startup_script_path:
                log.warning("Configured startup_script_path does not exist: %s",
                            self._cfg.startup_script_path)

            metadata.update(self._cfg.workload_metadata)
            # Always tell the VM which port to serve on so the workload can
            # read it from the metadata server and the backend's expectation
            # stays in sync with what the VM actually binds.
            metadata.setdefault("JETSTREAM_PORT", str(self._cfg.jetstream_port))
            if extra_metadata:
                metadata.update(extra_metadata)
            service_account = self._cfg.workload_service_account
            tags = list(self._cfg.network_tags)

        return self._client.create_node(
            zone=zone or self._cfg.zone,
            node_id=node_id or self._cfg.node_id,
            accelerator_type=accelerator_type or self._cfg.accelerator_type,
            runtime_version=runtime_version or self._cfg.runtime_version,
            spot=spot,
            enable_external_ips=self._cfg.enable_external_ips,
            startup_script=startup_script,
            metadata=metadata or None,
            service_account=service_account,
            tags=tags or None,
            wait=wait,
        )

    def delete(
        self,
        *,
        zone: str | None = None,
        node_id: str | None = None,
        wait: bool = True,
    ) -> dict[str, Any] | None:
        return self._client.delete_node(
            zone=zone or self._cfg.zone,
            node_id=node_id or self._cfg.node_id,
            wait=wait,
        )

    def recreate(self, *, candidate: Candidate | None = None, wait: bool = True) -> dict[str, Any]:
        """Delete-then-create on the same (or a different) candidate."""
        c = candidate or self._cfg.primary
        log.info("recreate: deleting any existing node in %s", c.zone)
        self.delete(zone=c.zone, wait=wait)
        log.info("recreate: creating new node in %s (%s / %s)",
                 c.zone, c.accelerator_type, c.runtime_version)
        return self.create(
            zone=c.zone,
            accelerator_type=c.accelerator_type,
            runtime_version=c.runtime_version,
            wait=wait,
        )

    # ── discovery / survey ───────────────────────────────────────────────
    def locations(self) -> list[str]:
        return [loc["locationId"] for loc in self._client.list_locations()]

    def survey_zones(self, zone_pattern: str | None = None) -> list[dict[str, Any]]:
        """Return one row per zone:
            {zone, count, families, types}
        `types` is the full list of accelerator type names (e.g. "v6e-1").
        `families` is a sorted unique set like ["v5e","v6e"].
        Zones with zero exposure are included with count=0.
        """
        all_locs = self.locations()
        if zone_pattern:
            zones = [z for z in all_locs if fnmatch.fnmatch(z, zone_pattern)]
        else:
            zones = all_locs
        zones = sorted(zones)

        rows: list[dict[str, Any]] = []
        for z in zones:
            try:
                accel_types = self._client.list_accelerator_types(z)
            except TpuApiError as e:
                rows.append({"zone": z, "count": 0, "families": [], "types": [],
                             "error": str(e)})
                continue
            type_names = [
                _short_name(a.get("name", ""), "acceleratorTypes")
                for a in accel_types
            ]
            type_names = [t for t in type_names if t]
            families = sorted({_family_of(t) for t in type_names if _family_of(t)})
            rows.append({
                "zone": z,
                "count": len(type_names),
                "families": families,
                "types": type_names,
            })
        return rows


def _short_name(name: str, kind: str) -> str:
    # "projects/x/locations/y/<kind>/<short>" → "<short>"
    marker = f"/{kind}/"
    idx = name.rfind(marker)
    return name[idx + len(marker):] if idx >= 0 else name


def _family_of(type_name: str) -> str:
    if type_name.startswith("v5litepod-"):
        return "v5e"
    if type_name.startswith("v5p-"):
        return "v5p"
    if type_name.startswith("v6e-"):
        return "v6e"
    if type_name.startswith("v4-"):
        return "v4"
    if type_name.startswith("v3-"):
        return "v3"
    if type_name.startswith("v2-"):
        return "v2"
    return ""
