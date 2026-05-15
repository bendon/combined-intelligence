"""Daily Spot-TPU lease with multi-zone failover and budget cap.

Same lifecycle as the PowerShell `tpu-rest-watchdog.ps1`:

  1. Ensure node exists & READY on the current candidate (create if missing).
  2. Poll state every `poll_interval_s`.
  3. On PREEMPTED / STOPPED / TERMINATED / FAILED / REPAIRING with auto_recover:
       - Delete dead resource in current zone.
       - Advance to next candidate (zone/accel/runtime).
       - Create fresh node there.
  4. On any exit path (deadline, SIGINT, SIGTERM, exception), sweep every
     zone we ever created a node in with a delete  - so systemd-stop or
     Ctrl+C never leaves orphans paying $$ in some other region.

Designed to run unattended under a systemd `.service` with a daily
`.timer`. See `infra/systemd/` for example unit files.
"""
from __future__ import annotations

import logging
import signal
import time
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Iterable

from .client import TpuApiError
from .config import Candidate, TpuConfig
from .manager import TpuManager

log = logging.getLogger(__name__)

RECOVER_STATES = {"PREEMPTED", "STOPPED", "TERMINATED", "FAILED", "REPAIRING"}
TRANSIENT_STATES = {"CREATING", "STARTING", "RESTARTING"}


@dataclass
class WatchdogOptions:
    max_runtime_minutes: int = 300
    poll_interval_s: int = 60
    auto_recover: bool = True


class _StopRequested(Exception):
    """Internal marker raised when SIGINT/SIGTERM lands."""


def _install_signal_handlers() -> None:
    def _raise_stop(signum, _frame):
        log.warning("Received signal %s  - initiating cleanup.", signum)
        raise _StopRequested()
    signal.signal(signal.SIGINT, _raise_stop)
    try:
        signal.signal(signal.SIGTERM, _raise_stop)
    except (AttributeError, ValueError):
        # SIGTERM not available on Windows for non-main threads, etc.
        pass


def _describe_candidates(cands: Iterable[Candidate]) -> None:
    log.info("Candidates:")
    for i, c in enumerate(cands):
        marker = "*" if i == 0 else " "
        log.info("  %s [%d] %-22s %-14s %s",
                 marker, i, c.zone, c.accelerator_type, c.runtime_version)


def run_watchdog(config: TpuConfig, options: WatchdogOptions) -> int:
    """Returns exit code: 0 on clean shutdown, 1 on unrecoverable error."""
    _install_signal_handlers()

    candidates = config.all_candidates()
    if not candidates:
        log.error("No candidates configured  - at least one TPU_ZONE is required.")
        return 1

    visited_zones: set[str] = {candidates[0].zone}
    current_idx = 0

    def current() -> Candidate:
        return candidates[current_idx]

    def advance(reason: str) -> bool:
        nonlocal current_idx
        if len(candidates) <= 1:
            log.warning("  no failover candidates configured  - staying on primary.")
            return False
        prev = current()
        current_idx = (current_idx + 1) % len(candidates)
        nxt = current()
        log.info("  failover: %s/%s -> %s/%s (reason: %s)",
                 prev.zone, prev.accelerator_type,
                 nxt.zone, nxt.accelerator_type, reason)
        visited_zones.add(nxt.zone)
        return True

    start = datetime.utcnow()
    deadline = start + timedelta(minutes=options.max_runtime_minutes)
    log.info("Watchdog start: project=%s node=%s", config.project, config.node_id)
    _describe_candidates(candidates)
    log.info("Budget: %d min  - deadline %s UTC",
             options.max_runtime_minutes, deadline.strftime("%Y-%m-%d %H:%M:%S"))

    with TpuManager(config) as mgr:
        def try_create_current() -> bool:
            c = current()
            try:
                mgr.create(
                    zone=c.zone,
                    accelerator_type=c.accelerator_type,
                    runtime_version=c.runtime_version,
                    wait=True,
                )
                visited_zones.add(c.zone)
                return True
            except TpuApiError as e:
                log.warning("create failed in %s/%s: %s",
                            c.zone, c.accelerator_type, e.api_message or e)
                return False
            except Exception as e:
                log.warning("create errored in %s/%s: %s", c.zone, c.accelerator_type, e)
                return False

        def ensure_up() -> None:
            c = current()
            state = mgr.get_state(zone=c.zone)
            now = datetime.utcnow().strftime("%H:%M:%S")
            log.info("[%s] zone=%s accel=%s state=%s",
                     now, c.zone, c.accelerator_type, state)

            if state == "READY" or state in TRANSIENT_STATES:
                return

            if state == "MISSING":
                tries = 0
                while tries < max(1, len(candidates)):
                    if try_create_current():
                        return
                    tries += 1
                    if tries >= len(candidates):
                        break
                    advance(reason="create failed")
                log.warning("  exhausted all candidates this tick  - will retry next poll.")
                return

            if state in RECOVER_STATES:
                if not options.auto_recover:
                    raise RuntimeError(f"TPU left healthy state ({state}); auto_recover=False")
                log.warning("  state=%s  - recovering.", state)
                try:
                    mgr.delete(zone=c.zone, wait=True)
                except Exception as e:
                    log.warning("  delete of dead resource failed (continuing): %s", e)
                advance(reason=f"state={state}")
                try_create_current()
                return

            # Unknown state  - just observe.
            log.info("  unknown state %s  - observing.", state)

        try:
            ensure_up()
            while datetime.utcnow() < deadline:
                # Sleep in 1s ticks so SIGINT/SIGTERM is responsive.
                for _ in range(options.poll_interval_s):
                    time.sleep(1)
                try:
                    ensure_up()
                except _StopRequested:
                    raise
                except Exception as e:
                    log.warning("tick error: %s", e)
            log.info("Daily budget reached  - initiating cleanup.")
            exit_code = 0
        except _StopRequested:
            log.info("Stop signal received  - initiating cleanup.")
            exit_code = 0
        except Exception:
            log.exception("Unhandled watchdog error  - initiating cleanup.")
            exit_code = 1
        finally:
            log.info("Sweeping visited zones (%d) to stop billing...",
                     len(visited_zones))
            for zone in sorted(visited_zones):
                try:
                    log.info("  deleting node in %s (if present)...", zone)
                    mgr.delete(zone=zone, wait=True)
                except Exception as e:
                    log.warning("  delete in %s: %s", zone, e)

    elapsed_min = int((datetime.utcnow() - start).total_seconds() // 60)
    log.info("Watchdog done after %d minutes.", elapsed_min)
    return exit_code
