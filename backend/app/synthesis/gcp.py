"""Start / stop the GCP on-demand VM that runs Ollama."""
import time
from google.cloud import compute_v1
from app.config import get_settings

settings = get_settings()

_instances = compute_v1.InstancesClient()
_ops = compute_v1.ZoneOperationsClient()


def _wait(project: str, zone: str, op_name: str, timeout: int = 300) -> None:
    deadline = time.time() + timeout
    while time.time() < deadline:
        op = _ops.get(project=project, zone=zone, operation=op_name)
        if op.status == compute_v1.Operation.Status.DONE:
            if op.error:
                raise RuntimeError(f"GCP op failed: {op.error}")
            return
        time.sleep(5)
    raise TimeoutError(f"GCP operation {op_name} did not complete in {timeout}s")


def start_vm() -> None:
    op = _instances.start(
        project=settings.gcp_project,
        zone=settings.gcp_zone,
        instance=settings.gcp_vm_instance,
    )
    _wait(settings.gcp_project, settings.gcp_zone, op.name)


def stop_vm() -> None:
    op = _instances.stop(
        project=settings.gcp_project,
        zone=settings.gcp_zone,
        instance=settings.gcp_vm_instance,
    )
    _wait(settings.gcp_project, settings.gcp_zone, op.name)


def vm_status() -> str:
    inst = _instances.get(
        project=settings.gcp_project,
        zone=settings.gcp_zone,
        instance=settings.gcp_vm_instance,
    )
    return inst.status  # "RUNNING", "TERMINATED", "STAGING", etc.
