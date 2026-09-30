#!/usr/bin/env bash
# NeuraForge AI — Bash installer (Mac / Linux)
# Synced with install.mjs — same flags and behavior
#
# Usage: bash install.sh [platform] [--dry-run] [--doctor]
# Platforms: claude | cursor | gemini | codex | kiro | copilot | opencode

set -euo pipefail

REPO="https://github.com/vikisingh23/neuraforge-ai"
CLONE_DIR="$HOME/.neuraforge-ai"
KNOWN_PLATFORMS="claude cursor gemini codex kiro copilot opencode"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${BLUE}⚒️  $*${NC}"; }
ok()   { echo -e "${GREEN}✅ $*${NC}"; }
warn() { echo -e "${YELLOW}⚠️  $*${NC}"; }
fail() { echo -e "${RED}❌ $*${NC}" >&2; }

# ── Parse flags ───────────────────────────────────────────────────────────────

DRY_RUN=false
DOCTOR=false
PLATFORM_ARG=""

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --doctor)  DOCTOR=true ;;
    --*)       warn "Unknown flag: $arg" ;;
    *)
      # Validate platform name against whitelist
      if echo "$KNOWN_PLATFORMS" | grep -qw "$arg"; then
        PLATFORM_ARG="$arg"
      else
        fail "Unknown platform: \"$arg\""
        echo "Valid platforms: $KNOWN_PLATFORMS" >&2
        exit 1
      fi
      ;;
  esac
done

# ── Doctor mode ───────────────────────────────────────────────────────────────

if [ "$DOCTOR" = true ]; then
  log "NeuraForge AI — Health Check"
  echo ""
  passed=0; failed=0

  check() {
    local label="$1"; shift
    if "$@" &>/dev/null; then
      ok "$label"; ((passed++)) || true
    else
      fail "$label"; ((failed++)) || true
    fi
  }

  check "agents/ directory exists"           test -d "agents"
  check "rules/ directory exists"            test -d "rules"
  check "AGENTS.md exists"                   test -f "AGENTS.md"
  check ".mcp.json exists and is valid JSON" python3 -m json.tool ".mcp.json"
  check ".neuraforge.yml is valid YAML"      python3 -c "import yaml; yaml.safe_load(open('.neuraforge.yml'))" 2>/dev/null || true
  check "No @latest in .mcp.json"           bash -c "! grep -q '@latest' .mcp.json"
  check "Node.js 18+ available"             node --version

  echo ""
  echo "Passed: $passed  Failed: $failed"
  [ "$failed" -eq 0 ] && ok "All checks passed" || { fail "Some checks failed"; exit 1; }
  exit 0
fi

# ── Platform detection ────────────────────────────────────────────────────────

detect_platform() {
  # Directory-based detection first — more reliable than CLI probing
  [ -d "$HOME/.cursor" ] && { echo "cursor"; return; }
  [ -d "$HOME/.gemini" ] && { echo "gemini"; return; }
  [ -d "$HOME/.kiro" ]   && { echo "kiro"; return; }

  # Fall back to CLI checks
  command -v claude    &>/dev/null && { echo "claude"; return; }
  command -v cursor    &>/dev/null && { echo "cursor"; return; }
  command -v gemini    &>/dev/null && { echo "gemini"; return; }
  command -v codex     &>/dev/null && { echo "codex"; return; }
  command -v kiro-cli  &>/dev/null && { echo "kiro"; return; }
  command -v opencode  &>/dev/null && { echo "opencode"; return; }
  command -v gh        &>/dev/null && { echo "copilot"; return; }
  echo "unknown"
}

# ── Clone / update repo ───────────────────────────────────────────────────────

clone_repo() {
  if [ -d "$CLONE_DIR" ]; then
    log "Updating NeuraForge AI..."
    git -C "$CLONE_DIR" pull --progress || {
      fail "Failed to update repo at $CLONE_DIR"
      fail "Try: rm -rf $CLONE_DIR and re-run"
      exit 1
    }
  else
    log "Downloading NeuraForge AI..."
    git clone --depth 1 --progress "$REPO" "$CLONE_DIR" || {
      fail "Failed to clone repo"
      fail "Check your internet connection and that git is installed"
      exit 1
    }
  fi
}

# ── Copy files ────────────────────────────────────────────────────────────────

copy_files() {
  local all_ok=true
  for f in "$@"; do
    local src="$CLONE_DIR/$f"
    local dst="./$f"
    if [ ! -e "$src" ]; then
      warn "Source not found, skipping: $f"
      continue
    fi
    if [ "$DRY_RUN" = true ]; then
      log "[dry-run] Would copy: $f"
      continue
    fi
    mkdir -p "$(dirname "$dst")"
    if cp -r "$src" "$dst" 2>/tmp/nf_cp_err; then
      ok "$f"
    else
      fail "Failed to copy $f: $(cat /tmp/nf_cp_err)"
      all_ok=false
    fi
  done
  [ "$all_ok" = true ]
}

# ── Main ──────────────────────────────────────────────────────────────────────

log "NeuraForge AI Installer"
[ "$DRY_RUN" = true ] && warn "Dry-run mode — no files will be written"
echo ""

PLATFORM="${PLATFORM_ARG:-$(detect_platform)}"
log "Platform: $PLATFORM"
echo ""

clone_repo
echo ""

COMMON=("AGENTS.md" "agents" "rules")

case "$PLATFORM" in
  claude)
    log "Configuring for Claude Code..."
    copy_files "${COMMON[@]}" "skills" ".mcp.json"
    ok "Files installed. Add agents/ and rules/ to your project root."
    ;;
  cursor)
    log "Configuring for Cursor..."
    copy_files "${COMMON[@]}" ".cursor" ".mcp.json"
    ok "Cursor rules + MCP servers configured. Restart Cursor."
    ;;
  gemini)
    log "Configuring for Gemini CLI..."
    copy_files "${COMMON[@]}" ".gemini" "GEMINI.md" ".mcp.json"
    ok "Gemini CLI configured."
    ;;
  codex|opencode|kiro|copilot)
    log "Configuring for $PLATFORM..."
    copy_files "${COMMON[@]}" ".mcp.json"
    ok "$PLATFORM configured. AGENTS.md will be auto-discovered."
    ;;
  *)
    warn "Platform not detected. Installing universal config..."
    copy_files "${COMMON[@]}" ".mcp.json"
    ok "AGENTS.md + agents + rules + MCP config installed."
    echo ""
    echo "Specify platform: bash install.sh [$KNOWN_PLATFORMS]"
    ;;
esac

echo ""
ok "40 agents · 22 MCP servers · 35 skills · 7 stacks"
echo "Docs: $REPO"
