# FTMS Treadmill Test

Progressive Web App (PWA) to test if your gym treadmill supports the open FTMS (Fitness Machine Service) Bluetooth standard.

**No app store. No installation. Just open in browser.**

> **Note:** This is a quick AI-assisted prototype. No code review has been done. Use at your own risk.

## Features

- Connect to Bluetooth treadmills via Web Bluetooth API
- Detect FTMS protocol support
- Read real-time data: speed, distance, time, incline
- Save workouts to phone (localStorage)
- Export workout history as CSV
- Works offline (PWA with service worker)

## How to use

1. Open on your phone:
   - **Android**: Chrome browser
   - **iPhone**: [Bluefy browser](https://apps.apple.com/app/bluefy-web-ble-browser/id1492822055) (Safari doesn't support Web Bluetooth)
2. Tap "Ühenda jooksulindiga"
3. Select your treadmill from Bluetooth list
4. See real-time data as you run
5. Save workout when done

## Limitations

| Feature | Status |
|---------|--------|
| Read speed/distance/time | Works |
| Read incline | Works |
| Control speed | Blocked (Technogym requires certification) |
| iPhone Safari | Not supported (use Bluefy) |

## Tech stack

- Vanilla HTML/CSS/JS (no frameworks)
- Web Bluetooth API
- FTMS protocol (Bluetooth SIG standard)
- Service Worker for offline support
- LocalStorage for workout persistence

## Project structure

```
ftms-treadmill-test/
├── index.html      # Main HTML
├── style.css       # Styles (mobile-first)
├── ftms.js         # FTMS protocol parser
├── storage.js      # LocalStorage workout persistence
├── app.js          # Main application logic
├── sw.js           # Service worker (offline)
├── manifest.json   # PWA manifest
├── icon.svg        # App icon
└── TODO.md         # Open questions and next steps
```

## Testing without gym

Use [FTMS Emulator](https://ftmsemu.github.io/) to test in browser without real treadmill.

## Related projects

- [janposselt/treadmill-monitor](https://github.com/janposselt/treadmill-monitor) - Similar Web Bluetooth + FTMS project
- [lefty01/ESP32_TTGO_FTMS](https://github.com/lefty01/ESP32_TTGO_FTMS) - ESP32 FTMS implementation
- [blak3r/treadspan](https://github.com/blak3r/treadspan) - Open source treadmill tracking

## Links

- [FTMS Specification](https://www.bluetooth.com/specifications/specs/fitness-machine-service-1-0/)
- [Web Bluetooth API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API)
- [Technogym Developer](https://developer.technogym.com/)
- [FTMS Emulator](https://ftmsemu.github.io/)

## Background

Why this exists: I hate apps. I wanted to track my treadmill workouts without installing yet another app that wants my data, sends notifications, and takes up phone storage.

Web Bluetooth lets browsers talk to Bluetooth devices directly. FTMS is an open standard that many fitness machines support. Combine them = workout tracking without app store nonsense.

## Author

Anne - December 2024
