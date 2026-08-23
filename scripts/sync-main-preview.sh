#!/bin/zsh

set -eu

readonly repo="${FRAGCOORD_REPO:-/home/banditelol/Spaces/Personal/FragCoordRe}"
readonly vp_bin="${FRAGCOORD_VP_BIN:-/home/banditelol/.vite-plus/bin/vp}"
readonly lock_file="${FRAGCOORD_SYNC_LOCK:-/tmp/fragcoord-main-preview-sync.lock}"

log() {
  print -r -- "[$(/usr/bin/date --iso-8601=seconds)] $*"
}

exec 9>"${lock_file}"
if ! /usr/bin/flock -n 9; then
  exit 0
fi

if [[ "$(/usr/bin/git -C "${repo}" branch --show-current)" != "main" ]]; then
  log "Skipped: ${repo} is not on main."
  exit 0
fi

if [[ -n "$(/usr/bin/git -C "${repo}" status --porcelain --untracked-files=no)" ]]; then
  log "Skipped: main has tracked local changes."
  exit 0
fi

/usr/bin/git -C "${repo}" fetch --quiet origin main

readonly current_commit="$(/usr/bin/git -C "${repo}" rev-parse HEAD)"
readonly remote_commit="$(/usr/bin/git -C "${repo}" rev-parse origin/main)"

if [[ "${current_commit}" == "${remote_commit}" ]]; then
  exit 0
fi

if ! /usr/bin/git -C "${repo}" merge-base --is-ancestor "${current_commit}" "${remote_commit}"; then
  log "Refused: local main cannot fast-forward to origin/main."
  exit 1
fi

dependencies_changed=false
if ! /usr/bin/git -C "${repo}" diff --quiet "${current_commit}" "${remote_commit}" -- package.json pnpm-lock.yaml; then
  dependencies_changed=true
fi

/usr/bin/git -C "${repo}" merge --ff-only --quiet origin/main

if [[ "${dependencies_changed}" == "true" ]]; then
  "${vp_bin}" install --frozen-lockfile
fi

log "Updated main from ${current_commit[1,8]} to ${remote_commit[1,8]}; the development preview can hot-reload the new files."
