# Ghost Glove — App & Backend Requirements

> For Claude Code. App-side only. ESP32 firmware is out of scope for this document.

---

## ⚠️ Architecture Change Notice

**The previous implementation had the ESP32 make direct API calls over WiFi. This is no longer the case.**

The data pipeline has fundamentally changed:

```
OLD: ESP32 → WiFi → API → NeonSQL
NEW: ESP32 → BLE → Mobile App → Backend API → NeonSQL
```

The **HiveMQ MQTT broker** and **NeonSQL database** are being retained, but the ESP32 no longer connects to them directly. The mobile app now owns the BLE connection and is responsible for forwarding data upstream.

Any existing code that assumed ESP32 → API direct calls should be treated as deprecated and replaced.

---

## BLE Data Packet

The ESP32 transmits a single structured packet per rep/interval over BLE. The app must parse this packet:

| Field       | Type   | Notes                                                            |
| ----------- | ------ | ---------------------------------------------------------------- |
| `accel_x`   | float  | m/s²                                                             |
| `accel_y`   | float  | m/s²                                                             |
| `accel_z`   | float  | m/s²                                                             |
| `gyro_x`    | float  | deg/s                                                            |
| `gyro_y`    | float  | deg/s                                                            |
| `gyro_z`    | float  | deg/s                                                            |
| `flex_1`    | float  | Thumb (raw ADC or mapped voltage)                                |
| `flex_2`    | float  | Index                                                            |
| `flex_3`    | float  | Middle                                                           |
| `flex_4`    | float  | Ring                                                             |
| `rep_count` | int    | Cumulative rep count from ESP32                                  |
| `timestamp` | uint32 | Milliseconds since session start (used for speed/tempo analysis) |

---

## Tech Stack

- **Framework:** React Native (Expo) — consistent with existing Hale app work
- **BLE:** `react-native-ble-plx` or Expo's BLE module
- **Backend:** New lightweight backend, **hosted for free** (options: Railway free tier, Render free tier, or Supabase Edge Functions)
- **Database:** NeonSQL (existing, retain)
- **Broker:** HiveMQ (existing, retain) — app publishes to MQTT topics via backend or directly
- **Fonts:** Space Grotesk (primary), Space Mono (secondary) — load via `@expo-google-fonts`

---

## Design System

Match the Ghost Glove brand style guide exactly:

### Colours

```js
const colours = {
  primary: "#39FF6A", // Electric green — CTAs, active states, highlights
  background: "#111310", // Near-black — all screens
  secondary: "#1F2E22", // Dark green — cards, panels
  neutral: "#8A9E8D", // Muted sage — labels, timestamps, secondary data (NEVER white at 12px)
  warning: "#FF4444", // Red — errors, alerts
  white: "#F0F7F1", // Off-white — body text
};
```

### Typography

```js
// All sizes in px (React Native: use these as fontSize values)
const type = {
  hero: 48, // Space Grotesk Bold — hero moments only
  title: 32, // Space Grotesk — screen titles, primary stats
  sectionHeader: 20, // Space Grotesk — section headers, exercise names, ghost labels
  body: 16, // Space Grotesk — body text, descriptions, feedback copy
  label: 12, // Space Mono — labels, timestamps, secondary data
  // ⚠️ Always render 12px in neutral (#8A9E8D), never white
};
```

### Design Principles

- Dark background on all screens (`#111310`)
- Minimal, clean — no visual clutter
- Primary green used sparingly as accent only
- Space Mono for all data readouts (monospaced for alignment)
- Space Grotesk for all narrative/UI text

---

## App Architecture (Data Flow)

```
ESP32-C3 (BLE peripheral)
    │
    │  BLE characteristic notify
    ▼
Mobile App (BLE central)
    ├── Parse BLE packet
    ├── Run flex sensor position lookup (finger mapping)
    ├── Display live values (IMU + flex)
    ├── Display rep count
    ├── Maintain ring buffer (last N packets)
    └── On session end / buffer flush → HTTP POST to Backend
            │
            ▼
        Backend API (free-hosted)
            ├── Receive session data
            ├── POST to NeonSQL (session records, rep logs)
            ├── Publish summary to HiveMQ MQTT topic
            └── Future: intensity calculations, ghost comparison data
```

---

## Feature Requirements

### F1 — BLE Connection

- Scan for and connect to ESP32-C3 peripheral (device name: `GhostGlove` or configurable)
- Subscribe to BLE characteristic for data notifications
- Handle reconnection gracefully (auto-reconnect on drop)
- Show connection status indicator on all screens

### F2 — Flex Sensor Display & Finger Position Lookup

- Display raw flex sensor values for all 4 sensors (Thumb, Index, Middle, Ring)
- Apply lookup table to map ADC/voltage value → finger position label
  - Position states (to define with lookup thresholds): `EXTENDED`, `PARTIAL`, `BENT`, `CLOSED`
  - Thresholds TBD via calibration — implement as a configurable constant object
- Display both raw value and mapped position label in the UI
- Visual representation of hand/finger state (simple indicator, not necessarily a 3D model at this stage)

### F3 — IMU Display

- Live display of all 6 IMU values (accel XYZ, gyro XYZ)
- Use Space Mono font for numerical readouts
- Update in real-time as BLE packets arrive

### F4 — Rep Counter Display

- Display current rep count (sourced from ESP32 packet, not recounted in app)
- Large, prominent — 48px hero treatment
- Session total visible at all times during active session

### F5 — Session Ring Buffer

- Maintain a rolling ring buffer of the last N BLE packets (N = configurable, default 300)
- Buffer used to batch-upload to backend without overwhelming the API on every packet
- Flush buffer: on session end, or when buffer hits max capacity, or on manual trigger

### F6 — Data Export — IMU Graph

- Generate a time-series graph of IMU data from session buffer
- Axes: time (x), acceleration/gyro values (y)
- Export as image (PNG) or shareable format
- Library: `react-native-chart-kit` or `Victory Native`

### F7 — Data Export — Flex Sensor Graph

- Generate time-series graph of all 4 flex sensor channels
- Same export mechanism as F6

### F8 — Backend Integration

- New backend service, hosted for free (Railway / Render / Supabase Edge Functions — pick one)
- Endpoints required:
  - `POST /session` — upload a completed session (metadata + packet array)
  - `GET /sessions` — retrieve historical sessions for a user
  - `GET /session/:id` — retrieve a specific session with full packet data
- Backend writes to NeonSQL and publishes summary to HiveMQ
- App authenticates requests with a simple API key or JWT (TBD)

### F9 — Historical Data View

- View past sessions retrieved from backend
- Show: date, rep count, session duration
- Tap to expand: view IMU + flex graphs for that session

---

## Screen Map

```
App
├── Home / Dashboard
│   ├── Connect button (BLE status)
│   ├── Last session summary
│   └── Start Session CTA
│
├── Live Session Screen
│   ├── Rep Counter (hero, 48px)
│   ├── Flex Sensor Panel (4 sensors, value + position label)
│   ├── IMU Panel (6 values, live)
│   └── End Session button
│
├── Session Review Screen
│   ├── Rep total
│   ├── IMU graph (exportable)
│   ├── Flex sensor graph (exportable)
│   └── Upload to backend / Save locally
│
└── History Screen
    ├── Session list
    └── Session detail (graphs + stats)
```

---

## Out of Scope (This Document)

- ESP32 firmware (separate requirements doc)
- Ghost avatar / gamification layer (future milestone)
- User authentication / accounts (future milestone)
- Anything related to the old WiFi / direct API call architecture

---

## Notes for Implementation

- Prioritise getting BLE parsing and live display working first (F1–F4) before backend work
- The flex sensor lookup table thresholds will need calibration passes — build the system as configurable from day one, not hardcoded
- Keep backend minimal — it only needs to store and retrieve data at this stage; intensity calculations are a future concern
- Ring buffer implementation should be decoupled from the display layer so it can be flushed independently
- Use NativeWind for stling, not CSS
