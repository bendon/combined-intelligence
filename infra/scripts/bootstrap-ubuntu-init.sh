# shellcheck shell=bash
# Resolve script directory and source bootstrap-ubuntu-common.sh.
# Call from phase1/phase2/vm scripts BEFORE any other bootstrap logic:
#
#   _bootstrap_this="${BASH_SOURCE[0]}"
#   # shellcheck source=bootstrap-ubuntu-init.sh
#   source "$(dirname "$_bootstrap_this")/bootstrap-ubuntu-init.sh"

_bootstrap_script_path="${BASH_SOURCE[1]:-${BASH_SOURCE[0]}}"
_bootstrap_script_dir="$(cd "$(dirname "$_bootstrap_script_path")" && pwd)"
_bootstrap_common="${_bootstrap_script_dir}/bootstrap-ubuntu-common.sh"

if [[ ! -f "$_bootstrap_common" ]]; then
  _uh="$(getent passwd "${SUDO_USER:-${USER:-root}}" 2>/dev/null | cut -d: -f6 || echo "${HOME}")"
  _candidates=()
  [[ -n "${REPO_DIR:-}" ]] && _candidates+=("${REPO_DIR}")
  _candidates+=("${_uh}/combined-intelligence" "/srv/combined-intelligence")
  for _repo in "${_candidates[@]}"; do
    [[ -z "$_repo" ]] && continue
    if [[ -f "${_repo}/infra/scripts/bootstrap-ubuntu-common.sh" ]]; then
      export REPO_DIR="${REPO_DIR:-$_repo}"
      _bootstrap_script_dir="${_repo}/infra/scripts"
      _bootstrap_common="${_bootstrap_script_dir}/bootstrap-ubuntu-common.sh"
      break
    fi
  done
fi

if [[ ! -f "$_bootstrap_common" ]]; then
  cat >&2 <<'EOF'
ERROR: bootstrap-ubuntu-common.sh not found.

Do not curl a single script into /tmp — run from your git clone:

  cd ~/combined-intelligence
  git pull
  sudo bash infra/scripts/bootstrap-ubuntu-phase1-packages.sh

Or set REPO_DIR explicitly:

  sudo env REPO_DIR=/home/bendon/combined-intelligence bash infra/scripts/bootstrap-ubuntu-phase1-packages.sh
EOF
  exit 1
fi

export BOOTSTRAP_SCRIPT_DIR="$_bootstrap_script_dir"
export REPO_DIR="${REPO_DIR:-$(cd "${_bootstrap_script_dir}/../.." && pwd)}"

# shellcheck source=bootstrap-ubuntu-common.sh
source "$_bootstrap_common"
