# OpenClaw Browser Plugin Configuration Guide

## 1. Configuration File (`openclaw.json`)
Location: `~/.openclaw/openclaw.json` (Windows: `C:\Users\<User>\.openclaw\openclaw.json`)

### Correct Structure
**Critical**: The `browser` configuration block must be placed at the **root level** of the JSON object. 
Common mistake: Placing it under `plugins.entries`.

**Correct JSON Example:**
```json
{
  "gateway": {
    "port": 18789,
    "mode": "local",
    ...
  },
  "browser": {
    "enabled": true,
    "defaultProfile": "openclaw"
  },
  "plugins": {
    "entries": {
      "telegram": {
        "enabled": true
      }
    }
  },
  ...
}
```

## 2. Model Configuration
Ensure the model ID in your configuration matches what is supported by the Antigravity Proxy.

- **Recommended**: `gemini-3-flash` (Faster, reliable)
- **Path**: Update in two places:
    1. `agents.defaults.model.primary`: `"antigravity-proxy/gemini-3-flash"`
    2. `models.providers.antigravity-proxy.models[0].id`: `"gemini-3-flash"`

## 3. Service Startup (Windows)
If `run_bridge.bat` fails or closes immediately, launch the services manually using PowerShell or Command Prompt. You need two separate windows.

**Window 1: Antigravity Proxy**
```powershell
antigravity-claude-proxy start
```
*Expected Port: 8080*

**Window 2: OpenClaw Gateway**
```powershell
openclaw gateway run
```
*Expected Port: 18789*

## 4. Verification
To confirm everything is working:

1.  **Check Ports**:
    ```powershell
    netstat -ano | findstr "8080 18789"
    ```
    Both ports should be in `LISTENING` state.

2.  **Check Browser Plugin**:
    ```powershell
    openclaw browser --browser-profile openclaw status
    ```
    Should return "healthy" and detect your Chrome/Edge installation.

3.  **Test Navigation**:
    ```powershell
    openclaw browser --browser-profile openclaw open https://google.com
    ```
