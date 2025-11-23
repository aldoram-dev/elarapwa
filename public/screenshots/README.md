# PWA Screenshots

Add at least two screenshots to unlock the richer install UI in Chrome:

- Desktop (wide): 1280x800 or similar 16:10/16:9 aspect.
- Mobile (narrow): 720x1280 (portrait) or similar 9:16 aspect.

Place the images here and update `public/manifest.webmanifest` like:

```json
"screenshots": [
  { "src": "/screenshots/desktop.png", "sizes": "1280x800", "type": "image/png", "form_factor": "wide", "label": "Dashboard (Desktop)" },
  { "src": "/screenshots/mobile.png", "sizes": "720x1280", "type": "image/png", "label": "Dashboard (Mobile)" }
]
```

Tips:
- Use Chrome’s device toolbar to capture consistent sizes (⌥⌘I → Toggle device toolbar → Capture screenshot).
- Keep sensitive data out of screenshots.
