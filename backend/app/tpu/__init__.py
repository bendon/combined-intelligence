"""Cloud TPU lifecycle management.

Canonical Python implementation of the TPU controller  - replaces the
`infra/gcp/tpu-rest-*.ps1` scripts on Linux/Ubuntu deployments. The PowerShell
versions are kept as a Windows-dev convenience but this is the source of truth.

Public API:
    from app.tpu import TpuConfig, TpuManager, run_watchdog

CLI:
    python -m app.tpu get
    python -m app.tpu create --node-id ci-tpu-1
    python -m app.tpu delete --node-id ci-tpu-1 --wait
    python -m app.tpu watchdog --max-minutes 300
    python -m app.tpu survey --zone-pattern "asia-*"
"""
from .config import TpuConfig, Candidate
from .manager import TpuManager
from .watchdog import run_watchdog

__all__ = ["TpuConfig", "Candidate", "TpuManager", "run_watchdog"]
