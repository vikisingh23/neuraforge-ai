#!/usr/bin/env bash
# NeuraForge AI: thin wrapper around the Node installer (same flags). Needs Node.js 18+.
# Usage: bash install.sh [platform] [--dry-run] [--latest] [--doctor]
set -euo pipefail
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js 18+ is required. Install it from https://nodejs.org and re-run." >&2
  exit 1
fi
exec node "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/install.mjs" "$@"
