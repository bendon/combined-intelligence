"""TPU configuration: discover repo paths, load infra/.env, resolve settings.

The CLI must work standalone (e.g. invoked by systemd from a minimal venv with
just `httpx` + `google-auth` available), so this module deliberately does NOT
depend on `app.config` / pydantic-settings. It reads `infra/.env` directly
with a small parser, then layers in any `os.environ` overrides.

Precedence (highest wins):
    1. Explicit constructor kwargs
    2. Process environment variables
    3. infra/.env values
    4. backend/.env values (only for GCP_PROJECT fallback)
    5. Hard-coded defaults
"""
from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterable


# ── repo path discovery ────────────────────────────────────────────────────
# This file lives at: <repo>/backend/app/tpu/config.py
# So repo root is parents[3].
_THIS_FILE = Path(__file__).resolve()
REPO_ROOT = _THIS_FILE.parents[3]
INFRA_ENV = REPO_ROOT / "infra" / ".env"
BACKEND_ENV = REPO_ROOT / "backend" / ".env"
DEFAULT_SA_KEY_FILE = REPO_ROOT / "infra" / "gcp" / "service-account.json"


def parse_dotenv(path: Path) -> dict[str, str]:
    """Lightweight .env parser  - strips quotes, ignores blanks/comments.

    Does NOT do shell-expansion. Multi-line values are NOT supported (use the
    failover format `zone|accel|runtime;...` instead).
    """
    out: dict[str, str] = {}
    if not path.exists():
        return out
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if "=" not in line:
            continue
        key, _, val = line.partition("=")
        key = key.strip()
        val = val.strip()
        # strip surrounding quotes if any
        if len(val) >= 2 and val[0] == val[-1] and val[0] in ("'", '"'):
            val = val[1:-1]
        out[key] = val
    return out


def _load_env_layers() -> dict[str, str]:
    """Merge infra/.env + backend/.env into a single dict (backend wins ties
    only for keys present in both  - infra/.env values take precedence)."""
    merged: dict[str, str] = {}
    merged.update(parse_dotenv(BACKEND_ENV))
    merged.update(parse_dotenv(INFRA_ENV))
    return merged


@dataclass(frozen=True)
class Candidate:
    """One zone/accelerator/runtime tuple in the failover rotation."""
    zone: str
    accelerator_type: str
    runtime_version: str

    def __str__(self) -> str:
        return f"{self.zone}|{self.accelerator_type}|{self.runtime_version}"


def parse_failovers(spec: str, primary: Candidate) -> list[Candidate]:
    """Parse `TPU_FAILOVERS` env value into ordered Candidate list.

    Format: `zone|accel|runtime;zone|accel|runtime;...`
    Missing accel / runtime fields fall back to the primary's values.
    Empty entries are skipped.
    """
    if not spec:
        return []
    out: list[Candidate] = []
    for raw in spec.split(";"):
        entry = raw.strip()
        if not entry:
            continue
        parts = [p.strip() for p in entry.split("|")]
        if not parts[0]:
            continue
        zone = parts[0]
        accel = parts[1] if len(parts) > 1 and parts[1] else primary.accelerator_type
        runtime = parts[2] if len(parts) > 2 and parts[2] else primary.runtime_version
        out.append(Candidate(zone=zone, accelerator_type=accel, runtime_version=runtime))
    return out


@dataclass
class TpuConfig:
    project: str
    zone: str
    accelerator_type: str
    runtime_version: str
    node_id: str
    enable_external_ips: bool = True
    service_account_key_file: Path | None = None
    failovers: list[Candidate] = field(default_factory=list)
    # ── workload deployment knobs (passed into create_node metadata) ──────
    # Path to a shell script that the TPU VM runs once at first boot.
    # See infra/gcp/tpu-vm/bootstrap.sh for the canonical version.
    startup_script_path: Path | None = None
    # Service account the TPU VM itself impersonates (NOT the SA used by this
    # CLI to call the TPU API). Needs roles/storage.objectViewer if the
    # workload pulls model weights from GCS. Empty -> default compute SA.
    workload_service_account: str = ""
    # Extra metadata key=value pairs forwarded to the VM. The workload reads
    # these via the metadata server (curl -H 'Metadata-Flavor: Google' ...).
    # Example: {"MODEL_NAME": "gemma2-9b", "MODEL_GCS": "gs://my-bucket/gemma2-9b"}.
    workload_metadata: dict[str, str] = field(default_factory=dict)
    # Network tags applied to the TPU VM. Use these as targets in your
    # firewall rule that allows the Ubuntu server to reach JetStream.
    # Default tag "ci-tpu" matches the recommended firewall in tpu-vm/README.md.
    network_tags: list[str] = field(default_factory=lambda: ["ci-tpu"])
    # Port that JetStream / your inference server listens on. The Ubuntu
    # backend hits http://<tpu-external-ip>:<port>/ from synthesis tasks.
    jetstream_port: int = 9000

    @classmethod
    def load(
        cls,
        *,
        project: str | None = None,
        zone: str | None = None,
        accelerator_type: str | None = None,
        runtime_version: str | None = None,
        node_id: str | None = None,
        failovers: str | None = None,
        service_account_key_file: str | Path | None = None,
        env_overrides: dict[str, str] | None = None,
    ) -> "TpuConfig":
        """Resolve config from constructor args > os.environ > .env files > defaults."""
        import os

        dotenv = _load_env_layers()

        def pick(key: str, override: str | None, default: str = "") -> str:
            if override:
                return override
            if env_overrides and key in env_overrides:
                return env_overrides[key]
            val = os.environ.get(key)
            if val:
                return val
            return dotenv.get(key, default)

        # ─ project ────────────────────────────────────────────────────────
        resolved_project = pick("GCP_PROJECT", project) or pick("TPU_PROJECT", None)
        if not resolved_project:
            raise RuntimeError(
                "GCP project not set. Define GCP_PROJECT in infra/.env or "
                "pass project=… explicitly."
            )

        # ─ primary triple (defaults match the PowerShell scripts) ─────────
        resolved_zone = pick("TPU_ZONE", zone, "asia-southeast1-b")
        resolved_accel = pick("TPU_ACCELERATOR_TYPE", accelerator_type, "v6e-1")
        resolved_runtime = pick("TPU_RUNTIME_VERSION", runtime_version, "v2-alpha-tpuv6e")
        resolved_node = pick("TPU_NAME", node_id, "ci-tpu-spot")

        # ─ external IPs ───────────────────────────────────────────────────
        ext_ips_str = pick("TPU_ENABLE_EXTERNAL_IPS", None, "true").lower()
        resolved_ext_ips = ext_ips_str in ("1", "true", "yes", "on")

        # ─ failovers ──────────────────────────────────────────────────────
        failover_spec = pick("TPU_FAILOVERS", failovers, "")
        primary_cand = Candidate(
            zone=resolved_zone,
            accelerator_type=resolved_accel,
            runtime_version=resolved_runtime,
        )
        resolved_failovers = parse_failovers(failover_spec, primary_cand)

        # ─ service-account key path ───────────────────────────────────────
        sa_override = service_account_key_file
        if sa_override is None:
            sa_override = pick("GCP_SERVICE_ACCOUNT_KEY_FILE", None, "")
        sa_path: Path | None
        if sa_override:
            sa_path = Path(sa_override).expanduser().resolve()
        elif DEFAULT_SA_KEY_FILE.exists():
            sa_path = DEFAULT_SA_KEY_FILE
        else:
            sa_path = None

        # ─ workload deployment ────────────────────────────────────────────
        startup_override = pick("TPU_STARTUP_SCRIPT_PATH", None, "")
        startup_path: Path | None
        if startup_override:
            p = Path(startup_override).expanduser()
            startup_path = p if p.is_absolute() else (REPO_ROOT / p).resolve()
        else:
            # Sensible default if the user dropped the canonical script in place.
            default_bootstrap = REPO_ROOT / "infra" / "gcp" / "tpu-vm" / "bootstrap.sh"
            startup_path = default_bootstrap if default_bootstrap.exists() else None

        workload_sa = pick("TPU_WORKLOAD_SERVICE_ACCOUNT", None, "")

        # TPU_WORKLOAD_METADATA="KEY1=val1;KEY2=val2"  - simple parser, no escaping.
        # For values with spaces/special chars, pass via the Python API instead.
        meta_spec = pick("TPU_WORKLOAD_METADATA", None, "")
        meta_extra: dict[str, str] = {}
        if meta_spec:
            for entry in meta_spec.split(";"):
                entry = entry.strip()
                if not entry or "=" not in entry:
                    continue
                k, _, v = entry.partition("=")
                meta_extra[k.strip()] = v.strip()

        # Optionally surface a couple of well-known workload keys as their own
        # env vars for clarity (these just feed into workload_metadata).
        for legacy_key in ("MODEL_NAME", "MODEL_GCS", "JETSTREAM_PORT"):
            v = pick(legacy_key, None, "")
            if v and legacy_key not in meta_extra:
                meta_extra[legacy_key] = v

        tags_spec = pick("TPU_NETWORK_TAGS", None, "ci-tpu")
        tags = [t.strip() for t in tags_spec.split(",") if t.strip()]

        jetstream_port_str = pick("JETSTREAM_PORT", None, "9000")
        try:
            jetstream_port = int(jetstream_port_str)
        except ValueError:
            jetstream_port = 9000

        return cls(
            project=resolved_project,
            zone=resolved_zone,
            accelerator_type=resolved_accel,
            runtime_version=resolved_runtime,
            node_id=resolved_node,
            enable_external_ips=resolved_ext_ips,
            service_account_key_file=sa_path,
            failovers=resolved_failovers,
            startup_script_path=startup_path,
            workload_service_account=workload_sa,
            workload_metadata=meta_extra,
            network_tags=tags,
            jetstream_port=jetstream_port,
        )

    @property
    def primary(self) -> Candidate:
        return Candidate(
            zone=self.zone,
            accelerator_type=self.accelerator_type,
            runtime_version=self.runtime_version,
        )

    def all_candidates(self) -> list[Candidate]:
        """Primary first, then failovers in order."""
        return [self.primary, *self.failovers]

    def describe(self) -> Iterable[str]:
        yield f"project = {self.project}"
        yield f"node_id = {self.node_id}"
        yield f"service_account = {self.service_account_key_file or '<none  - will try metadata/gcloud>'}"
        yield "candidates:"
        for i, c in enumerate(self.all_candidates()):
            marker = "*" if i == 0 else " "
            yield f"  {marker} [{i}] {c.zone:<22} {c.accelerator_type:<14} {c.runtime_version}"
        yield "workload:"
        yield f"  startup_script = {self.startup_script_path or '<none>'}"
        yield f"  service_account = {self.workload_service_account or '<default compute SA>'}"
        yield f"  jetstream_port = {self.jetstream_port}"
        yield f"  network_tags = {','.join(self.network_tags) or '<none>'}"
        if self.workload_metadata:
            yield "  metadata:"
            for k, v in sorted(self.workload_metadata.items()):
                yield f"    {k}={v}"
