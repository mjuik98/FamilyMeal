---
description: Telegram → OpenClaw + Ollama Local AI integration guide
---

# Telegram Bridge Setup (Ollama Local AI Edition)

Complete guide to set up automatic AI responses for Telegram messages using a locally hosted Ollama instance and OpenClaw gateway.

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Phase 1: Ollama Installation](#phase-1-ollama-installation)
4. [Phase 2: Model Setup](#phase-2-model-setup)
5. [Phase 3: OpenClaw Installation](#phase-3-openclaw-installation)
6. [Phase 4: Configuration](#phase-4-configuration)
7. [Phase 5: Gateway Startup](#phase-5-gateway-startup)
8. [Daily Operations](#daily-operations)
9. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

```mermaid
graph LR
    Telegram([📱 Telegram Message]) -->|Port 18789| Gateway[🦞 OpenClaw Gateway]
    Gateway -->|OpenAI Compatible API| Ollama[🦙 Ollama Server]
    Ollama -->|Inference| Model[🧠 Local LLM (qwen/gemma)]
    Gateway -->|Auto-Reply| Telegram
```

**Components:**
| Component | Role | Port |
|-----------|------|------|
| [OpenClaw Gateway](https://github.com/openclaw/openclaw) | Bridges Telegram to AI backend | 18789 |
| [Ollama](https://ollama.com) | Local LLM runner and API server | 11434 |
| [Local Model](https://ollama.com/library) | The actual AI brain (e.g. qwen2.5-coder) | N/A |

---

## Prerequisites

### System Requirements
- **OS**: Windows 10/11, macOS, Linux
- **RAM**: Minimum 16GB (for 7B models), 32GB recommended
- **Storage**: 4-10GB per model
- **Node.js**: v18.0.0 or higher (LTS recommended)

### Telegram Bot Token
1. Open [@BotFather](https://t.me/BotFather) in Telegram.
2. Send `/newbot` to create a new bot.
3. Copy the HTTP API Token (e.g. `8413661068:AAFg...`).

---

## Phase 1: Ollama Installation

### Windows
```powershell
# Install via winget
winget install Ollama.Ollama

# Or download from official site: https://ollama.com/download
```

### macOS
```bash
brew install ollama
```

### Linux
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

### Verification
```powershell
# Use absolute path on Windows if PATH issue occurs
& "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe" --version
```

---

## Phase 2: Model Setup

### Recommended Models
> [!IMPORTANT]
> **Tool Calling Support is Mandatory.**
> Models like `gemma3` do NOT support tool calling in Ollama yet and will cause errors in OpenClaw. Use `qwen2.5-coder` or similar models.

| Model | Size | RAM Req | Features |
|-------|------|---------|----------|
| `qwen2.5-coder:7b` | 4.7GB | 16GB+ | Best for coding, Tool Support ✅ |
| `qwen2.5-coder:3b` | 2.0GB | 8GB+ | Lightweight, Fast ✅ |
| `qwen3-coder` | 8GB+ | 32GB+ | Cutting edge ✅ |

### Download Model
```powershell
# Recommended: qwen2.5-coder:7b
& "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe" pull qwen2.5-coder:7b
```

### Test Model
Verify the model works locally before connecting OpenClaw:
```powershell
& "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe" run qwen2.5-coder:7b "Hello test"
```

---

## Phase 3: OpenClaw Installation

### Windows (Official PowerShell Script)
```powershell
iwr -useb https://openclaw.ai/install.ps1 | iex
```

### macOS/Linux
```bash
curl -fsSL https://openclaw.ai/install.sh | bash
```

---

## Phase 4: Configuration

### Configuration File
**Location:** `%USERPROFILE%\.openclaw\openclaw.json` (Windows) or `~/.openclaw/openclaw.json` (Mac/Linux)

Replace the entire content with this robust configuration:

```json
{
  "meta": {
    "lastTouchedVersion": "2026.2.6-3",
    "lastTouchedAt": "2026-02-08T00:00:00.000Z"
  },
  "wizard": {
    "lastRunAt": "2026-02-08T00:00:00.000Z",
    "lastRunVersion": "2026.2.6-3",
    "lastRunCommand": "onboard",
    "lastRunMode": "local"
  },
  "agents": {
    "defaults": {
      "model": {
        "primary": "ollama/qwen2.5-coder:7b"
      }
    }
  },
  "models": {
    "providers": {
      "ollama": {
        "api": "openai-completions",
        "apiKey": "ollama-local",
        "baseUrl": "http://127.0.0.1:11434/v1",
        "models": [
          {
            "contextWindow": 131072,
            "cost": {
              "cacheRead": 0,
              "cacheWrite": 0,
              "input": 0,
              "output": 0
            },
            "id": "qwen2.5-coder:7b",
            "input": ["text"],
            "maxTokens": 16384,
            "name": "qwen2.5-coder:7b",
            "reasoning": false
          }
        ]
      }
    }
  },
  "channels": {
    "telegram": {
      "enabled": true,
      "dmPolicy": "open",
      "botToken": "YOUR_BOT_TOKEN_HERE",
      "allowFrom": ["*"],
      "groupPolicy": "disabled",
      "streamMode": "partial"
    }
  },
  "gateway": {
    "port": 18789,
    "mode": "local",
    "bind": "loopback",
    "auth": {
      "mode": "token",
      "token": "your-secure-token"
    }
  },
  "plugins": {
    "entries": {
      "telegram": { "enabled": true }
    }
  }
}
```

> [!WARNING]
> **Critical Fields:**
> - `wizard.lastRunAt`: Must be present to bypass initial wizard.
> - `gateway.auth.token`: Required for local authentication.
> - `botToken`: Replace with your actual Telegram bot token.

---

## Phase 5: Gateway Startup

### Step 5.1: Verify Ollama Service
Ensure Ollama is running in the background.
```powershell
& "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe" list
```

### Step 5.2: Start OpenClaw Gateway
```powershell
openclaw gateway run
```

### Expected Output
```
00:42:47 [telegram] [default] starting provider (@YourBotName)
00:42:47 [telegram] autoSelectFamily=false (default-node22)
```

---

## Daily Operations

### Startup
```powershell
openclaw gateway run
```

### Shutdown
```powershell
taskkill /F /IM "node.exe"
```

### Check Logs
```powershell
Get-Content "$env:TEMP\openclaw\openclaw-$(Get-Date -Format 'yyyy-MM-dd').log" -Tail 50
```

---

## Troubleshooting

### ❌ "HTTP 404: model 'xxx' not found"
**Cause:** The configured model ID does not exist in your local Ollama library.
**Fix:**
```powershell
& "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe" pull qwen2.5-coder:7b
```

### ❌ "does not support tools" (400 Error)
**Cause:** Using a model that lacks function calling capabilities (e.g., `gemma3`).
**Fix:** Switch to a tool-supported model like `qwen2.5-coder`.
1. Remove old model: `ollama rm gemma3:4b`
2. Install new model: `ollama pull qwen2.5-coder:7b`
3. Update `openclaw.json` primary model.

### ❌ "Port 18789 is already in use"
**Cause:** A zombie OpenClaw process is blocking the port.
**Fix:**
```powershell
netstat -ano | findstr 18789
taskkill /F /PID <PID_FOUND>
# Or kill all node processes
taskkill /F /IM node.exe
```

### ❌ Telegram Timeout / No Response
**Cause:** Model "Cold Start" takes too long (30-60s), causing Telegram webhook to timeout.
**Fix:** Warm up the model via CLI before sending a message.
```powershell
ollama run qwen2.5-coder:7b "warm up"
```

### ❌ "Invalid config" / "api: Invalid input"
**Cause:** Incorrect API type in `openclaw.json`.
**Fix:** Ensure `"api": "openai-completions"` is used. Do NOT use `"ollama"` or `"openai-chat"`.
