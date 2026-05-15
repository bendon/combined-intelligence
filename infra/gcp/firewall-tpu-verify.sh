#!/usr/bin/env bash
# ────────────────────────────────────────────────────────────────────────────
# Combined Intelligence  -  TPU firewall verification
#
# Confirms the actual GCP state matches what `infra/.env` says it should be:
#   1. firewall rule `ci-tpu-jetstream` exists
#   2. it allows tcp:9000 (or whatever JETSTREAM_PORT is)
#   3. source = UBUNTU_STATIC_IP/32
#   4. target = ci-tpu (or first entry of TPU_NETWORK_TAGS)
#   5. (if a TPU exists right now) it carries that tag
#   6. (if a TPU exists and JetStream is up) a TCP probe from this machine
#      to its endpoint succeeds; the test only makes sense when run FROM
#      the Ubuntu box itself, so it's marked informational on other hosts.
#
# Exit code: 0 = all checks pass, non-zero = something to fix.
# Use this in CI / pre-deploy / cron as a healthcheck.
# ────────────────────────────────────────────────────────────────────────────
set -uo pipefail

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
REPO_ROOT="$( cd "$SCRIPT_DIR/../.." && pwd )"
INFRA_ENV="$REPO_ROOT/infra/.env"

if [[ ! -f "$INFRA_ENV" ]]; then
  echo "ERROR: $INFRA_ENV not found." >&2
  exit 1
fi

# shellcheck disable=SC1090
set -a; source "$INFRA_ENV"; set +a

: "${GCP_PROJECT:?GCP_PROJECT must be set in infra/.env}"
: "${UBUNTU_STATIC_IP:?UBUNTU_STATIC_IP must be set in infra/.env}"
JETSTREAM_PORT="${JETSTREAM_PORT:-9000}"
TPU_NAME="${TPU_NAME:-ci-tpu-spot}"
TPU_ZONE="${TPU_ZONE:-asia-southeast1-b}"
JETSTREAM_RULE="ci-tpu-jetstream"
TPU_TAG="$(echo "${TPU_NETWORK_TAGS:-ci-tpu}" | awk -F, '{print $1}' | xargs)"
[[ -n "$TPU_TAG" ]] || TPU_TAG=ci-tpu

EXPECTED_SRC="$UBUNTU_STATIC_IP"
[[ "$EXPECTED_SRC" == */* ]] || EXPECTED_SRC="${EXPECTED_SRC}/32"

fail=0
ok()   { printf '  \033[32mOK\033[0m   %s\n' "$*"; }
bad()  { printf '  \033[31mFAIL\033[0m %s\n' "$*"; fail=$((fail+1)); }
warn() { printf '  \033[33mWARN\033[0m %s\n' "$*"; }
info() { printf '  --   %s\n' "$*"; }

echo "Verifying TPU firewall for project: $GCP_PROJECT"
echo "  expected source : $EXPECTED_SRC"
echo "  expected tag    : $TPU_TAG"
echo "  expected port   : tcp:$JETSTREAM_PORT"
echo

# ── 1-4: firewall rule shape ───────────────────────────────────────────────
echo "[1/3] Firewall rule '$JETSTREAM_RULE'"

rule_json="$(gcloud compute firewall-rules describe "$JETSTREAM_RULE" \
              --project="$GCP_PROJECT" --format=json 2>/dev/null || true)"

if [[ -z "$rule_json" ]] || [[ "$rule_json" == "null" ]]; then
  bad "rule does not exist  - run ./firewall-tpu-setup.sh"
else
  ok  "rule exists"

  current_src="$(echo "$rule_json" | python3 -c '
import json, sys
d = json.load(sys.stdin)
print(",".join(d.get("sourceRanges", [])))')"
  current_tags="$(echo "$rule_json" | python3 -c '
import json, sys
d = json.load(sys.stdin)
print(",".join(d.get("targetTags", [])))')"
  current_ports="$(echo "$rule_json" | python3 -c '
import json, sys
d = json.load(sys.stdin)
allowed = d.get("allowed", [])
out = []
for a in allowed:
    proto = a.get("IPProtocol", "")
    for p in a.get("ports", []) or []:
        out.append(f"{proto}:{p}")
    if not a.get("ports"):
        out.append(proto)
print(",".join(out))')"
  current_action="$(echo "$rule_json" | python3 -c '
import json, sys
d = json.load(sys.stdin)
print("ALLOW" if d.get("allowed") else ("DENY" if d.get("denied") else "?"))')"
  current_direction="$(echo "$rule_json" | python3 -c '
import json, sys
print(json.load(sys.stdin).get("direction", "?"))')"
  current_disabled="$(echo "$rule_json" | python3 -c '
import json, sys
print(json.load(sys.stdin).get("disabled", False))')"

  [[ "$current_direction" == "INGRESS" ]] \
    && ok "direction = INGRESS" \
    || bad "direction = $current_direction (expected INGRESS)"

  [[ "$current_action" == "ALLOW" ]] \
    && ok "action = ALLOW" \
    || bad "action = $current_action (expected ALLOW)"

  [[ "$current_disabled" == "False" ]] \
    && ok "rule enabled" \
    || bad "rule is disabled"

  if [[ ",$current_src," == *",$EXPECTED_SRC,"* ]]; then
    ok "source-ranges contains $EXPECTED_SRC"
    if [[ "$current_src" != "$EXPECTED_SRC" ]]; then
      warn "extra source-ranges present: '$current_src' (tighten with setup script if unwanted)"
    fi
  else
    bad "source-ranges='$current_src' does NOT include $EXPECTED_SRC"
  fi

  if [[ ",$current_tags," == *",$TPU_TAG,"* ]]; then
    ok "target-tags contains $TPU_TAG"
  else
    bad "target-tags='$current_tags' does NOT include $TPU_TAG"
  fi

  if [[ ",$current_ports," == *",tcp:$JETSTREAM_PORT,"* ]]; then
    ok "allows tcp:$JETSTREAM_PORT"
  else
    bad "allowed='$current_ports' does NOT include tcp:$JETSTREAM_PORT"
  fi
fi

echo

# ── 5: does the live TPU carry the tag? ────────────────────────────────────
echo "[2/3] TPU node '$TPU_NAME' @ $TPU_ZONE"

tpu_json="$(gcloud compute tpus tpu-vm describe "$TPU_NAME" \
             --zone="$TPU_ZONE" --project="$GCP_PROJECT" \
             --format=json 2>/dev/null || true)"

if [[ -z "$tpu_json" ]] || [[ "$tpu_json" == "null" ]]; then
  info "TPU is currently MISSING (expected during off-hours / between leases)"
  info "tag check skipped  - will be applied automatically by next create"
else
  tpu_tags="$(echo "$tpu_json" | python3 -c '
import json, sys
print(",".join(json.load(sys.stdin).get("tags", [])))')"
  tpu_state="$(echo "$tpu_json" | python3 -c '
import json, sys
print(json.load(sys.stdin).get("state", "?"))')"
  tpu_ip="$(echo "$tpu_json" | python3 -c '
import json, sys
d = json.load(sys.stdin)
for ep in d.get("networkEndpoints", []) or []:
    ac = ep.get("accessConfig") or {}
    if ac.get("externalIp"):
        print(ac["externalIp"]); break
')"
  info "state = $tpu_state"
  info "external IP = ${tpu_ip:-<none>}"

  if [[ ",$tpu_tags," == *",$TPU_TAG,"* ]]; then
    ok "TPU carries tag '$TPU_TAG'"
  else
    bad "TPU tags = '$tpu_tags' does NOT include '$TPU_TAG'  - firewall rule will NOT match this node!"
  fi
fi

echo

# ── 6: end-to-end TCP probe (Ubuntu-side only) ─────────────────────────────
echo "[3/3] Connectivity check (informational unless run from $EXPECTED_SRC)"

if [[ -n "${tpu_ip:-}" ]]; then
  # Try a 5s TCP connect. We use bash's /dev/tcp pseudo-device so this works
  # even without nc/curl. Timeout via `timeout` from coreutils.
  if command -v timeout >/dev/null 2>&1; then
    if timeout 5 bash -c "echo > /dev/tcp/$tpu_ip/$JETSTREAM_PORT" 2>/dev/null; then
      ok "TCP connect to $tpu_ip:$JETSTREAM_PORT succeeded from this host"
    else
      info "TCP connect FAILED from this host"
      info "  - this is EXPECTED unless you ran the script from $EXPECTED_SRC"
      info "  - run on the Ubuntu box to actually validate end-to-end reachability"
    fi
  else
    info "skipping  - 'timeout' not available on this system"
  fi
else
  info "skipping  - no TPU external IP available"
fi

echo
if [[ "$fail" -gt 0 ]]; then
  echo "FAILED $fail check(s). Fix and re-run."
  exit 1
fi
echo "All checks passed."
