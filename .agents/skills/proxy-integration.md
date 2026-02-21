# Antigravity Claude Proxy Integration Patterns

## Overview
The `antigravity-claude-proxy` exposes Antigravity IDE models (Claude/Gemini) as an OpenAI/Anthropic-compatible API, enabling integration with external tools like OpenClaw.

---

## API Endpoints

### Base URL
```
http://127.0.0.1:8080
```

### Anthropic Messages API
```
POST http://127.0.0.1:8080/v1/messages
Content-Type: application/json
x-api-key: any-string

{
  "model": "claude-sonnet-4-5",
  "messages": [{"role": "user", "content": "Hello"}],
  "max_tokens": 1024
}
```

### OpenAI Chat Completions API
```
POST http://127.0.0.1:8080/v1/chat/completions
Content-Type: application/json
Authorization: Bearer any-string

{
  "model": "gemini-3-flash",
  "messages": [{"role": "user", "content": "Hello"}]
}
```

---

## Available Models

| Model ID | Provider | Best For |
|----------|----------|----------|
| `claude-sonnet-4-5` | Claude | General coding, reasoning |
| `claude-sonnet-4-5-thinking` | Claude | Extended reasoning |
| `claude-opus-4-5-thinking` | Claude | Complex reasoning |
| `gemini-3-flash` | Gemini | Fast responses |
| `gemini-3-pro-high` | Gemini | High-quality outputs |
| `gemini-2.5-pro` | Gemini | Balanced performance |

---

## Integration with OpenClaw

### Provider Configuration
```json
{
  "models": {
    "providers": {
      "antigravity-proxy": {
        "baseUrl": "http://127.0.0.1:8080",
        "apiKey": "test",
        "api": "anthropic-messages",
        "models": [
          { "id": "claude-sonnet-4-5", "name": "Claude Sonnet 4.5" }
        ]
      }
    }
  }
}
```

### Model Reference Format
```
antigravity-proxy/claude-sonnet-4-5
```

---

## Dashboard Features

### Accounts Tab
- View linked Google accounts
- Add new accounts via OAuth
- Monitor account status

### Models Tab
- View available models
- Check quota percentages
- Monitor rate limits

### Settings Tab
- Configure polling interval
- Apply to Claude CLI
- Server settings

---

## Troubleshooting

### Account Not Detected
1. Ensure Antigravity IDE is running
2. Ensure you're logged in to IDE
3. Restart proxy server

### Model Quota Exhausted
- Wait for reset (shown in Models tab)
- Switch to different model
- Use Gemini models (typically have higher quota)

### Connection Refused
- Verify proxy is running
- Check port 8080 is not in use
- Use `127.0.0.1` instead of `localhost`
