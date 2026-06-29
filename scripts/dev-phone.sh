#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

load_env() {
  if [[ -f "$ROOT/.env" ]]; then
    set -a
    # shellcheck disable=SC1091
    source "$ROOT/.env"
    set +a
  fi
}

usage() {
  cat <<EOF
Usage: npm run dev:phone [-- --team TEAM_ID] [-- DEVICE_UDID]

Set signing account via one of:
  1. APPLE_TEAM_ID in .env
  2. --team flag: npm run dev:phone -- --team XXXXXXXXXX

Find your Team ID in Xcode → Settings → Accounts → select team → Team ID
Or run: security find-identity -v -p codesigning
EOF
}

load_env

while [[ $# -gt 0 ]]; do
  case "$1" in
    --team)
      if [[ -z "${2:-}" ]]; then
        echo "Error: --team requires a Team ID" >&2
        exit 1
      fi
      export APPLE_TEAM_ID="$2"
      shift 2
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      break
      ;;
  esac
done

PBXPROJ="$ROOT/ios/Budgethinkar.xcodeproj/project.pbxproj"

if [[ ! -f "$PBXPROJ" ]]; then
  echo "Genererar iOS-projekt..."
  npx expo prebuild --platform ios
fi

if [[ -n "${APPLE_TEAM_ID:-}" ]]; then
  echo "Signing account: Apple Team ID $APPLE_TEAM_ID"
else
  echo "APPLE_TEAM_ID not set — Expo will prompt you to choose a signing account."
fi

# Expo skips -allowProvisioningUpdates when DEVELOPMENT_TEAM is already set.
if grep -q 'DEVELOPMENT_TEAM' "$PBXPROJ"; then
  backup="$(mktemp)"
  cp "$PBXPROJ" "$backup"
  sed -i '' '/DEVELOPMENT_TEAM/d' "$PBXPROJ"
  trap 'cp "$backup" "$PBXPROJ"' EXIT
fi

exec npx expo run:ios --device "$@"
