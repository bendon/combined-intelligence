"""CLI:  python -m app.tpu <subcommand> [args]

Subcommands:
    get               Show current node state.
    create            Create a node (Spot by default).
    delete            Delete the node (idempotent: 404 = ok).
    recreate          Delete-then-create on primary.
    watchdog          Daily lease with multi-zone failover (see config).
    locations         List Cloud TPU locations enabled for this project.
    list-accelerators List accelerator types available in a zone.
    list-runtimes     List runtime versions available in a zone.
    survey            One-shot table of zones+families+types matching a glob.

All commands read defaults from infra/.env (TPU_ZONE, TPU_ACCELERATOR_TYPE,
TPU_RUNTIME_VERSION, TPU_NAME, TPU_FAILOVERS, GCP_PROJECT,
GCP_SERVICE_ACCOUNT_KEY_FILE). Override per-call with CLI flags.
"""
from __future__ import annotations

import argparse
import json
import logging
import sys

from .config import TpuConfig
from .manager import TpuManager
from .watchdog import WatchdogOptions, run_watchdog


def _build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="python -m app.tpu",
        description="Cloud TPU lifecycle CLI (Spot, daily-lease, multi-zone).",
    )
    p.add_argument("--log-level", default="INFO",
                   choices=["DEBUG", "INFO", "WARNING", "ERROR"])
    p.add_argument("--project", help="GCP project (overrides .env GCP_PROJECT).")
    p.add_argument("--node-id", help="TPU node name (overrides TPU_NAME).")
    p.add_argument("--zone", help="Zone (overrides TPU_ZONE).")
    p.add_argument("--accelerator-type", help="Overrides TPU_ACCELERATOR_TYPE.")
    p.add_argument("--runtime-version", help="Overrides TPU_RUNTIME_VERSION.")
    p.add_argument("--service-account-key-file",
                   help="Path to SA JSON (overrides GCP_SERVICE_ACCOUNT_KEY_FILE).")
    p.add_argument("--failovers",
                   help="Override TPU_FAILOVERS for this run "
                        "('zone|accel|runtime;zone|accel|runtime;...'). "
                        "Pass empty string to disable rotation.")

    sub = p.add_subparsers(dest="command", required=True)

    sub.add_parser("get",       help="Show current node state.")
    sub.add_parser("recreate",  help="Delete-then-create on primary.")
    sub.add_parser("locations", help="List TPU locations for this project.")
    sub.add_parser("get-endpoint",
                   help="Print the JetStream URL the backend will hit (or empty if down).")
    sub.add_parser("describe",
                   help="Print resolved TPU config (workload metadata, candidates, etc.).")

    sp = sub.add_parser("create", help="Create a Spot TPU node.")
    sp.add_argument("--no-wait", action="store_true", help="Return immediately.")
    sp.add_argument("--no-spot", action="store_true", help="Create on-demand, not Spot.")

    sp = sub.add_parser("delete", help="Delete the TPU node.")
    sp.add_argument("--no-wait", action="store_true")

    sp = sub.add_parser("watchdog", help="Daily lease with multi-zone failover.")
    sp.add_argument("--max-minutes", type=int, default=300,
                    help="Hard runtime cap. Default: 300 (5h).")
    sp.add_argument("--poll-interval", type=int, default=60,
                    help="Seconds between state polls. Default: 60.")
    sp.add_argument("--no-auto-recover", action="store_true",
                    help="Exit on first preemption instead of advancing.")

    sp = sub.add_parser("list-accelerators",
                        help="List accelerator types in a zone.")
    sp.add_argument("--for-zone", required=False,
                    help="Defaults to TPU_ZONE if omitted.")

    sp = sub.add_parser("list-runtimes",
                        help="List runtime versions in a zone.")
    sp.add_argument("--for-zone", required=False)

    sp = sub.add_parser("survey",
                        help="Scan many zones at once for accelerator availability.")
    sp.add_argument("--zone-pattern", default="*",
                    help="fnmatch glob (e.g. 'asia-*', 'us-east5-*'). Default: '*'.")
    sp.add_argument("--json", action="store_true",
                    help="Emit JSON instead of the table.")
    return p


def _make_config(args: argparse.Namespace) -> TpuConfig:
    return TpuConfig.load(
        project=args.project,
        zone=args.zone,
        accelerator_type=args.accelerator_type,
        runtime_version=args.runtime_version,
        node_id=args.node_id,
        failovers=args.failovers,
        service_account_key_file=args.service_account_key_file,
    )


def _cmd_get(args, cfg: TpuConfig) -> int:
    with TpuManager(cfg) as mgr:
        state = mgr.get_state()
        print(f"{cfg.node_id} @ {cfg.zone}: {state}")
    return 0


def _cmd_get_endpoint(args, cfg: TpuConfig) -> int:
    with TpuManager(cfg) as mgr:
        endpoint = mgr.get_endpoint()
        if endpoint:
            print(endpoint)
            return 0
        print(f"(no endpoint  - node missing or has no external IP in {cfg.zone})",
              file=sys.stderr)
        return 1


def _cmd_describe(args, cfg: TpuConfig) -> int:
    for line in cfg.describe():
        print(line)
    return 0


def _cmd_create(args, cfg: TpuConfig) -> int:
    with TpuManager(cfg) as mgr:
        result = mgr.create(spot=not args.no_spot, wait=not args.no_wait)
        print(f"Created {cfg.node_id} in {cfg.zone}")
        if result.get("response"):
            print(json.dumps(result["response"], indent=2))
    return 0


def _cmd_delete(args, cfg: TpuConfig) -> int:
    with TpuManager(cfg) as mgr:
        result = mgr.delete(wait=not args.no_wait)
        if result is None:
            print(f"{cfg.node_id} not found in {cfg.zone} (already gone).")
        else:
            print(f"Deleted {cfg.node_id} from {cfg.zone}")
    return 0


def _cmd_recreate(args, cfg: TpuConfig) -> int:
    with TpuManager(cfg) as mgr:
        mgr.recreate(wait=True)
        print(f"Recreated {cfg.node_id} in {cfg.zone}.")
    return 0


def _cmd_locations(args, cfg: TpuConfig) -> int:
    with TpuManager(cfg) as mgr:
        locs = mgr.locations()
        for z in sorted(locs):
            print(f"  {z}")
    return 0


def _cmd_list_accelerators(args, cfg: TpuConfig) -> int:
    zone = args.for_zone or cfg.zone
    with TpuManager(cfg) as mgr:
        types = mgr.client.list_accelerator_types(zone)
        print(f"Accelerator types in {zone} (project: {cfg.project}):")
        if not types:
            print("  (none)")
            return 0
        for t in types:
            name = t.get("name", "")
            short = name.rsplit("/", 1)[-1] if name else "?"
            print(f"  {short}")
    return 0


def _cmd_list_runtimes(args, cfg: TpuConfig) -> int:
    zone = args.for_zone or cfg.zone
    with TpuManager(cfg) as mgr:
        versions = mgr.client.list_runtime_versions(zone)
        print(f"Runtime versions in {zone} (project: {cfg.project}):")
        if not versions:
            print("  (none)")
            return 0
        for v in versions:
            print(f"  {v.get('version', '?')}")
    return 0


def _cmd_survey(args, cfg: TpuConfig) -> int:
    with TpuManager(cfg) as mgr:
        rows = mgr.survey_zones(zone_pattern=args.zone_pattern)
        if args.json:
            print(json.dumps(rows, indent=2))
            return 0
        print(f"Surveying {len(rows)} zones for project {cfg.project}...\n")
        for r in rows:
            if r["count"] == 0:
                print(f"  {r['zone']:<30} (empty)")
            else:
                fams = ",".join(r["families"]) if r["families"] else "?"
                print(f"  {r['zone']:<30} {r['count']:>3} type(s): {fams}")
        # Pretty table for non-empty zones.
        nonempty = [r for r in rows if r["count"] > 0]
        if nonempty:
            print("\nZones with available accelerators:\n")
            zw = max(len("Zone"), max(len(r["zone"]) for r in nonempty))
            fw = max(len("Families"),
                     max(len(",".join(r["families"])) for r in nonempty))
            print(f"  {'Zone':<{zw}}  {'Families':<{fw}}  Types")
            print(f"  {'-' * zw}  {'-' * fw}  {'-' * 5}")
            for r in nonempty:
                fams = ",".join(r["families"])
                # Truncate types to ~80 chars so the table stays readable.
                t_join = ", ".join(r["types"])
                if len(t_join) > 80:
                    t_join = t_join[:77] + "..."
                print(f"  {r['zone']:<{zw}}  {fams:<{fw}}  {t_join}")
    return 0


_HANDLERS = {
    "get":               _cmd_get,
    "get-endpoint":      _cmd_get_endpoint,
    "describe":          _cmd_describe,
    "create":            _cmd_create,
    "delete":            _cmd_delete,
    "recreate":          _cmd_recreate,
    "watchdog":          None,            # special path  - uses run_watchdog
    "locations":         _cmd_locations,
    "list-accelerators": _cmd_list_accelerators,
    "list-runtimes":     _cmd_list_runtimes,
    "survey":            _cmd_survey,
}


def main(argv: list[str] | None = None) -> int:
    parser = _build_parser()
    args = parser.parse_args(argv)

    logging.basicConfig(
        level=getattr(logging, args.log_level),
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    # Quiet down httpx/urllib3 spam at INFO.
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)

    cfg = _make_config(args)

    if args.command == "watchdog":
        return run_watchdog(
            cfg,
            WatchdogOptions(
                max_runtime_minutes=args.max_minutes,
                poll_interval_s=args.poll_interval,
                auto_recover=not args.no_auto_recover,
            ),
        )

    handler = _HANDLERS.get(args.command)
    if handler is None:
        parser.error(f"unknown command: {args.command}")
        return 2
    return handler(args, cfg)


if __name__ == "__main__":
    sys.exit(main())
