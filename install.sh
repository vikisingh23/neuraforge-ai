#!/usr/bin/env bash
set -e

# NeuraForge AI — Platform Installer
# Detects your AI coding platform and configures NeuraForge

REPO="https://github.com/vikisingh23/neuraforge-ai"
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}⚒️  NeuraForge AI Installer${NC}"
echo ""

# Auto-detect platform
detect_platform() {
  if command -v claude &>/dev/null; then echo "claude"; return; fi
  if command -v cursor &>/dev/null || [ -d "$HOME/.cursor" ]; then echo "cursor"; return; fi
  if command -v gemini &>/dev/null || [ -d "$HOME/.gemini" ]; then echo "gemini"; return; fi
  if command -v codex &>/dev/null; then echo "codex"; return; fi
  if command -v kiro &>/dev/null || command -v kiro-cli &>/dev/null; then echo "kiro"; return; fi
  if command -v opencode &>/dev/null; then echo "opencode"; return; fi
  if command -v gh &>/dev/null; then echo "copilot"; return; fi
  if command -v hermes &>/dev/null; then echo "hermes"; return; fi
  echo "unknown"
}

PLATFORM=${1:-$(detect_platform)}
echo -e "Detected platform: ${GREEN}${PLATFORM}${NC}"
echo ""

case $PLATFORM in
  claude)
    echo -e "${YELLOW}Installing for Claude Code...${NC}"
    claude plugin install --plugin-dir . 2>/dev/null || {
      echo "Add marketplace first:"
      echo "  /plugin marketplace add vikisingh23/neuraforge-ai"
      echo "  /plugin install neuraforge-ai"
    }
    ;;

  cursor)
    echo -e "${YELLOW}Installing for Cursor...${NC}"
    if [ ! -d ".cursor" ]; then
      echo "Cloning NeuraForge config..."
      git clone --depth 1 $REPO /tmp/neuraforge-ai 2>/dev/null
      cp -r /tmp/neuraforge-ai/.cursor .
      cp /tmp/neuraforge-ai/AGENTS.md .
      cp -r /tmp/neuraforge-ai/agents .
      cp -r /tmp/neuraforge-ai/rules .
      rm -rf /tmp/neuraforge-ai
    fi
    echo -e "${GREEN}✅ Cursor rules and MCP servers configured${NC}"
    echo "   Restart Cursor to activate."
    ;;

  gemini)
    echo -e "${YELLOW}Installing for Gemini CLI...${NC}"
    if [ ! -d ".gemini" ]; then
      git clone --depth 1 $REPO /tmp/neuraforge-ai 2>/dev/null
      cp -r /tmp/neuraforge-ai/.gemini .
      cp /tmp/neuraforge-ai/AGENTS.md .
      cp /tmp/neuraforge-ai/GEMINI.md .
      cp -r /tmp/neuraforge-ai/agents .
      cp -r /tmp/neuraforge-ai/rules .
      rm -rf /tmp/neuraforge-ai
    fi
    echo -e "${GREEN}✅ Gemini CLI MCP servers and agents configured${NC}"
    ;;

  codex)
    echo -e "${YELLOW}Installing for Codex...${NC}"
    git clone --depth 1 $REPO /tmp/neuraforge-ai 2>/dev/null
    cp /tmp/neuraforge-ai/AGENTS.md .
    cp -r /tmp/neuraforge-ai/agents .
    cp -r /tmp/neuraforge-ai/rules .
    rm -rf /tmp/neuraforge-ai
    echo -e "${GREEN}✅ AGENTS.md and agent prompts installed${NC}"
    echo "   Codex will auto-discover AGENTS.md."
    ;;

  kiro)
    echo -e "${YELLOW}Installing for Kiro IDE/CLI...${NC}"
    git clone --depth 1 $REPO /tmp/neuraforge-ai 2>/dev/null
    cp /tmp/neuraforge-ai/AGENTS.md .
    cp -r /tmp/neuraforge-ai/agents .
    cp -r /tmp/neuraforge-ai/rules .
    rm -rf /tmp/neuraforge-ai
    echo -e "${GREEN}✅ Agents and rules installed${NC}"
    echo "   Run: kiro-cli chat --agent forge"
    ;;

  copilot)
    echo -e "${YELLOW}Installing for GitHub Copilot CLI...${NC}"
    git clone --depth 1 $REPO /tmp/neuraforge-ai 2>/dev/null
    cp /tmp/neuraforge-ai/AGENTS.md .
    cp -r /tmp/neuraforge-ai/agents .
    cp -r /tmp/neuraforge-ai/rules .
    rm -rf /tmp/neuraforge-ai
    echo -e "${GREEN}✅ AGENTS.md installed — Copilot will read it automatically${NC}"
    ;;

  opencode)
    echo -e "${YELLOW}Installing for OpenCode...${NC}"
    git clone --depth 1 $REPO /tmp/neuraforge-ai 2>/dev/null
    cp /tmp/neuraforge-ai/AGENTS.md .
    cp -r /tmp/neuraforge-ai/agents .
    cp -r /tmp/neuraforge-ai/rules .
    rm -rf /tmp/neuraforge-ai
    echo -e "${GREEN}✅ AGENTS.md and agents installed${NC}"
    ;;

  *)
    echo -e "${YELLOW}Platform not auto-detected. Manual setup:${NC}"
    echo ""
    echo "  1. Clone: git clone $REPO"
    echo "  2. Copy agents/ and rules/ to your project"
    echo "  3. Copy AGENTS.md to your project root"
    echo "  4. Configure MCP servers from .mcp.json"
    echo ""
    echo "  Or specify platform: ./install.sh [claude|cursor|gemini|codex|kiro|copilot|opencode]"
    ;;
esac

echo ""
echo -e "${BLUE}39 agents · 22 MCP servers · 35 skills · 7 stacks${NC}"
echo -e "Docs: ${REPO}"
