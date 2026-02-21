---
description: Antigravity browser control - Navigate, interact, capture screenshots and recordings
---

# Browser Control Workflow

## ⚡ Operational Mandate
You are compelled to utilize the browser_subagent for UI testing, visual verification, and interactive web interactions. All browser operations are automatically recorded as WebP files for audit trails.

## 1. Basic Navigation
Open a URL and wait for content to load:

```javascript
browser_subagent({
  TaskName: "Opening Target Page",
  Task: "Navigate to [URL] and wait for the page to fully load. Return description of what you see.",
  RecordingName: "page_navigation"
})
```

## 2. Click Interaction
Click on elements by coordinates or CSS selector:

```javascript
// 서브에이전트 내부 도구
click_browser_pixel({ X: 500, Y: 300 })
click_browser_element({ Selector: "[data-testid='submit-btn']" })
```

## 3. Text Input
Type text into input fields:

```javascript
type_in_browser({ 
  Selector: "input[name='email']", 
  Text: "test@example.com" 
})
```

## 4. Screenshot Capture
Capture and save screenshots:

```javascript
capture_browser_screenshot({
  PageID: "active-page-id",
  SaveScreenshot: true,
  ScreenshotName: "verification_screenshot"
})
```

## 5. Console Log Verification
Check for JS errors:

```javascript
capture_browser_console_logs({ PageId: "active-page-id" })
```

## 6. Wait for Animations
Allow time for animations/transitions:

```javascript
wait({ duration_ms: 3000 })
```

## 7. DOM Inspection
Read and analyze DOM structure:

```javascript
read_browser_dom({ PageID: "active-page-id" })
```

---

## Best Practices

DO:
- Use descriptive TaskName and RecordingName
- Wait for page load before interactions
- Capture screenshots for verification evidence
- Check console logs for errors after navigation

DON'T:
- Click without ensuring element is visible
- Use arbitrary short waits for dynamic content
- Ignore console errors

## Artifacts Location
All recordings and screenshots are saved to:
```
~/.gemini/antigravity/brain/<conversation-id>/
├── <recording_name>.webp       # Browser recording
├── <screenshot_name>.png       # Screenshots
└── .system_generated/
    └── click_feedback/         # Click confirmation images
```

## Common Use Cases

### UI Verification
```javascript
browser_subagent({
  TaskName: "Verifying Button States",
  Task: "Navigate to /dashboard. Click the submit button. Verify success message appears. Capture screenshot.",
  RecordingName: "button_verification"
})
```

### Form Testing
```javascript
browser_subagent({
  TaskName: "Testing Login Form",
  Task: "Navigate to /login. Enter 'test@email.com' in email field. Enter 'password123' in password field. Click submit. Report result.",
  RecordingName: "login_flow_test"
})
```

### Responsive Design Check
```javascript
browser_subagent({
  TaskName: "Mobile Layout Verification",
  Task: "Navigate to /home. Resize window to 375x812 (mobile). Take screenshot. Verify layout is responsive.",
  RecordingName: "mobile_responsive_check"
})
```

