#!/usr/bin/env bash
# ────────────────────────────────────────────────────────────────────────────
# Combined Intelligence  -  TPU firewall setup (idempotent)
#
# Creates / updates the GCP firewall rule that lets the Ubuntu backend reach
# JetStream on the Spot TPU VMs. Reads its config from `infra/.env`:
#
#   GCP_PROJECT          : project where TPUs live
#   UBUNTU_STATIC_IP     : single source IP allowed through (REQUIRED)
#   TPU_NETWORK_TAGS     : tag(s) applied to TPUs (must include "ci-tpu")
#   JETSTREAM_PORT       : the TCP port to open. Default 9000.
#   TPU_SSH_ALLOWED_IPS  : optional, comma-separated /32s for SSH ingress
#
# Why a script when `gcloud compute firewall-rules create` is one command?
#  - Idempotency: re-running this after rotating the Ubuntu IP just updates
#    `--source-ranges`; manual one-shot commands either fail (already exists)
#    or require remembering to `delete` first.
#  - Single source of truth: the source IP lives in `infra/.env` alongside
#    everything else, not in shell history.
#  - Repeatable from a clean machine: bootstrap by `cd infra/gcp && ./firewall-tpu-setup.sh`.
#
# Usage:
#   cd infra/gcp
#   ./firewall-tpu-setup.sh                       # apply
#   ./firewall-tpu-setup.sh --dry-run             # just print what would change
#   ./firewall-tpu-setup.sh --delete              # tear down both rules
# ────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── locate repo root + load infra/.env ─────────────────────────────────────
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
REPO_ROOT="$( cd "$SCRIPT_DIR/../.." && pwd )"
INFRA_ENV="$REPO_ROOT/infra/.env"

if [[ ! -f "$INFRA_ENV" ]]; then
  echo "ERROR: $INFRA_ENV not found (copy infra/.env.example first)." >&2
  exit 1
fi

# shellcheck disable=SC1090
set -a; source "$INFRA_ENV"; set +a

DRY_RUN=0
DELETE=0
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    --delete)  DELETE=1 ;;
    -h|--help)
      sed -n '2,30p' "$0"; exit 0 ;;
    *)
      echo "Unknown arg: $arg (use --help)"; exit 2 ;;
  esac
done

# ── required inputs ────────────────────────────────────────────────────────
: "${GCP_PROJECT:?GCP_PROJECT must be set in infra/.env}"
JETSTREAM_PORT="${JETSTREAM_PORT:-9000}"
NETWORK="${TPU_FIREWALL_NETWORK:-default}"
JETSTREAM_RULE="ci-tpu-jetstream"
SSH_RULE="ci-tpu-ssh"

# Primary network tag the TPU nodes get (matches TpuConfig.network_tags default).
# Take the first tag from TPU_NETWORK_TAGS to keep this in sync with what the
# control plane actually applies to nodes.
TPU_TAG="$(echo "${TPU_NETWORK_TAGS:-ci-tpu}" | awk -F, '{print $1}' | xargs)"
[[ -n "$TPU_TAG" ]] || TPU_TAG=ci-tpu

# ── helpers ────────────────────────────────────────────────────────────────
gc() {
  if [[ "$DRY_RUN" == "1" ]]; then
    echo "[dry-run] gcloud $*"
    return 0
  fi
  gcloud "$@"
}

rule_exists() {
  gcloud compute firewall-rules describe "$1" \
    --project="$GCP_PROJECT" >/dev/null 2>&1
}

# Compare two comma-separated CIDR lists, ignoring order and whitespace.
list_eq() {
  local a b
  a="$(echo "$1" | tr ',' '\n' | xargs -n1 | sort -u | xargs)"
  b="$(echo "$2" | tr ',' '\n' | xargs -n1 | sort -u | xargs)"
  [[ "$a" == "$b" ]]
}

# Get a specific field from an existing rule (returns "" if absent).
rule_field() {
  gcloud compute firewall-rules describe "$1" \
    --project="$GCP_PROJECT" \
    --format="value($2)" 2>/dev/null || true
}

normalize_ip_to_cidr() {
  local ip="$1"
  if [[ -z "$ip" ]]; then echo ""; return; fi
  if [[ "$ip" == */* ]]; then echo "$ip"; else echo "$ip/32"; fi
}

# ── delete mode ────────────────────────────────────────────────────────────
if [[ "$DELETE" == "1" ]]; then
  for rule in "$JETSTREAM_RULE" "$SSH_RULE"; do
    if rule_exists "$rule"; then
      echo "Deleting firewall rule '$rule'..."
      gc compute firewall-rules delete "$rule" \
        --project="$GCP_PROJECT" --quiet
    else
      echo "Rule '$rule' already absent  - nothing to delete."
    fi
  done
  exit 0
fi

# ── validate Ubuntu IP ─────────────────────────────────────────────────────
if [[ -z "${UBUNTU_STATIC_IP:-}" ]]; then
  cat >&2 <<EOF
ERROR: UBUNTU_STATIC_IP is empty in $INFRA_ENV.

Set it to the static public IPv4 of the Ubuntu server, e.g.

    UBUNTU_STATIC_IP=203.0.113.42

Then re-run: $0
EOF
  exit 1
fi

# Basic sanity check: looks like an IPv4?
if ! [[ "$UBUNTU_STATIC_IP" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}(/32)?$ ]]; then
  echo "ERROR: UBUNTU_STATIC_IP='$UBUNTU_STATIC_IP' is not a valid IPv4 (or /32)." >&2
  exit 1
fi

JETSTREAM_SRC="$(normalize_ip_to_cidr "$UBUNTU_STATIC_IP")"

echo "Project        : $GCP_PROJECT"
echo "VPC network    : $NETWORK"
echo "Target tag     : $TPU_TAG"
echo "JetStream port : tcp:$JETSTREAM_PORT"
echo "Source IP      : $JETSTREAM_SRC"
echo

# ── JetStream rule (always managed) ────────────────────────────────────────
if rule_exists "$JETSTREAM_RULE"; then
  current_src="$(rule_field "$JETSTREAM_RULE" sourceRanges)"
  current_tags="$(rule_field "$JETSTREAM_RULE" targetTags)"
  current_rules="$(rule_field "$JETSTREAM_RULE" allowed)"
  current_net_basename="$(rule_field "$JETSTREAM_RULE" network | awk -F/ '{print $NF}')"

  needs_update=0
  if ! list_eq "$current_src" "$JETSTREAM_SRC"; then
    echo "  source-ranges drift: '$current_src' -> '$JETSTREAM_SRC'"
    needs_update=1
  fi
  if ! list_eq "$current_tags" "$TPU_TAG"; then
    echo "  target-tags drift: '$current_tags' -> '$TPU_TAG'"
    needs_update=1
  fi
  if [[ "$current_net_basename" != "$NETWORK" ]]; then
    echo "  network mismatch: existing rule is on '$current_net_basename', want '$NETWORK'"
    echo "  -> rules cannot change networks; delete + re-create needed. Run with --delete first."
    exit 1
  fi
  # gcloud doesn't have a clean "show ports" field separate from protocols, so
  # we'll just always include the ports in the update to keep them aligned.

  if [[ "$needs_update" == "1" ]]; then
    echo "Updating firewall rule '$JETSTREAM_RULE'..."
    gc compute firewall-rules update "$JETSTREAM_RULE" \
      --project="$GCP_PROJECT" \
      --source-ranges="$JETSTREAM_SRC" \
      --target-tags="$TPU_TAG" \
      --rules="tcp:$JETSTREAM_PORT"
  else
    echo "Firewall rule '$JETSTREAM_RULE' already in sync. (allowed=$current_rules)"
  fi
else
  echo "Creating firewall rule '$JETSTREAM_RULE'..."
  gc compute firewall-rules create "$JETSTREAM_RULE" \
    --project="$GCP_PROJECT" \
    --network="$NETWORK" \
    --direction=INGRESS \
    --action=ALLOW \
    --rules="tcp:$JETSTREAM_PORT" \
    --source-ranges="$JETSTREAM_SRC" \
    --target-tags="$TPU_TAG" \
    --description="Ubuntu backend -> Spot TPU JetStream (combined-intelligence)"
fi

# ── SSH rule (only if TPU_SSH_ALLOWED_IPS is set) ──────────────────────────
if [[ -n "${TPU_SSH_ALLOWED_IPS:-}" ]]; then
  # Normalise each comma-separated entry into a /32.
  SSH_SRC="$(echo "$TPU_SSH_ALLOWED_IPS" | tr ',' '\n' | xargs -n1 | \
            while read -r ip; do normalize_ip_to_cidr "$ip"; done | paste -sd, -)"
  echo
  echo "SSH allowed    : $SSH_SRC"

  if rule_exists "$SSH_RULE"; then
    current_src="$(rule_field "$SSH_RULE" sourceRanges)"
    current_tags="$(rule_field "$SSH_RULE" targetTags)"
    needs_update=0
    if ! list_eq "$current_src" "$SSH_SRC"; then
      echo "  ssh source-ranges drift: '$current_src' -> '$SSH_SRC'"
      needs_update=1
    fi
    if ! list_eq "$current_tags" "$TPU_TAG"; then
      echo "  ssh target-tags drift: '$current_tags' -> '$TPU_TAG'"
      needs_update=1
    fi
    if [[ "$needs_update" == "1" ]]; then
      echo "Updating firewall rule '$SSH_RULE'..."
      gc compute firewall-rules update "$SSH_RULE" \
        --project="$GCP_PROJECT" \
        --source-ranges="$SSH_SRC" \
        --target-tags="$TPU_TAG" \
        --rules="tcp:22"
    else
      echo "Firewall rule '$SSH_RULE' already in sync."
    fi
  else
    echo "Creating firewall rule '$SSH_RULE'..."
    gc compute firewall-rules create "$SSH_RULE" \
      --project="$GCP_PROJECT" \
      --network="$NETWORK" \
      --direction=INGRESS \
      --action=ALLOW \
      --rules=tcp:22 \
      --source-ranges="$SSH_SRC" \
      --target-tags="$TPU_TAG" \
      --description="Ops SSH to Spot TPUs (combined-intelligence)"
  fi
else
  # Tidy: if SSH list is now empty but rule exists, leave it alone (operator
  # may have created it manually). We only auto-delete on `--delete`.
  if rule_exists "$SSH_RULE"; then
    echo
    echo "Note: '$SSH_RULE' exists but TPU_SSH_ALLOWED_IPS is empty in infra/.env."
    echo "      Run '$0 --delete' to tear it down, or set TPU_SSH_ALLOWED_IPS to re-sync."
  fi
fi

echo
echo "Done. Verify with:  ./firewall-tpu-verify.sh"
