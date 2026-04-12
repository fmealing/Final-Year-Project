# Ghost Glove — Setup Guide

## What you need

- ESP32-C3 dev board
- MPU6050 (I2C, address `0x68`)
- ADS1115 ADC (I2C, address `0x48`)
- 4× flex sensors wired to ADS1115 channels A0–A3
- USB cable (to flash the firmware)
- Chrome or Edge browser (Web Bluetooth is not supported in Firefox or Safari)

---

## 1. Wire the hardware

| Signal | ESP32-C3 pin |
|--------|-------------|
| SDA    | GP1 (pin 4) |
| SCL    | GP0 (pin 5) |
| 3.3 V  | 3V3         |
| GND    | GND         |

Both the MPU6050 and ADS1115 share the same I2C bus (SDA/SCL). Connect them in parallel.

Flex sensors connect to a voltage divider feeding ADS1115 channels A0–A3.

---

## 2. Install Arduino IDE board support

1. Open **Arduino IDE → Preferences**
2. Paste the following into **Additional Boards Manager URLs**:
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
3. Go to **Tools → Board → Boards Manager**, search `esp32`, and install **esp32 by Espressif Systems**

---

## 3. Install Arduino libraries

In **Tools → Manage Libraries**, install all three:

| Library | Author |
|---------|--------|
| Adafruit MPU6050 | Adafruit |
| Adafruit Unified Sensor | Adafruit |
| Adafruit ADS1X15 | Adafruit |

The BLE library (`BLEDevice.h`) ships with the ESP32 board core — no separate install needed.

---

## 4. Flash the firmware

1. Open `arduino/esp32_c3_sensors/esp32_c3_sensors.ino` in Arduino IDE
2. Select board: **Tools → Board → ESP32 Arduino → ESP32C3 Dev Module**
3. Select the correct port under **Tools → Port**
4. Click **Upload**
5. Open **Tools → Serial Monitor** at **115200 baud** — you should see:

   ```
   [OK] MPU6050 ready
   [OK] ADS1115 ready
   [OK] BLE advertising as 'GhostGlove'
   --- Live Readings (~50 Hz) ---
   ```

The glove is now advertising over BLE. You can unplug the USB and power it from a battery — it will start advertising automatically on boot.

---

## 5. Run the website

```bash
cd glove-web
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in **Chrome or Edge**.

---

## 6. Connect in the browser

1. Click **Connect Glove** in the top-right corner
2. A browser dialog will appear scanning for BLE devices — select **GhostGlove**
3. Click **Pair**

The dashboard will start showing live data immediately:

- **Rep Count** — increments as the glove detects reps
- **Flex Sensors** — raw ADC readings (0–32767) for each finger, shown as progress bars
- **Accelerometer** — X/Y/Z in m/s²
- **Gyroscope** — X/Y/Z in rad/s
- **T+** — elapsed session time in seconds

---

## Troubleshooting

**"Web Bluetooth is not supported"** — switch to Chrome or Edge. Safari and Firefox do not support Web Bluetooth.

**Device not appearing in the browser dialog** — make sure the Serial Monitor is closed (it may hold the USB port), confirm the firmware uploaded successfully, and check that you see `[OK] BLE advertising` in Serial Monitor before disconnecting USB.

**Sensors read zero or garbage** — check I2C wiring (SDA/SCL swapped is common). Confirm MPU6050 is at `0x68` and ADS1115 is at `0x48` using an I2C scanner sketch.

**Flex bars show no movement** — the ADS1115 reads signed int16, so the effective range in single-ended mode is 0–32767. If all readings sit at zero, check the flex sensor voltage divider circuit.
