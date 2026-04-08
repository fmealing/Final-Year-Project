# 👻 Ghost Glove

### _Progress you can see._

> **By Mealing Labs** — A smart gym glove that automatically tracks strength training sessions in real time, built as a Final Year Project for MEng Mechatronic and Robotic Engineering at the University of Birmingham.

---

![Logo](images_new/Logo.png)

---

## 🧠 The Idea

Most people who join the gym quit. Not because they're lazy — because they can't _see_ the progress. Numbers in a notebook don't feel like anything. Comparing yourself to the person next to you feels worse.

Ghost Glove solves this with a different question: **what if your only opponent was your past self?**

Every time you train, the glove records your session and builds a ghost — a data-driven avatar of who you were. Over time, you race against previous versions of yourself. The gap is small at first. But it's real. And you can't argue with it.

---

## 👤 Meet Jamie

> _Jamie joined the gym in January. Not for the first time. Third time, actually._

Jamie is 24. The first two times he went hard for about three weeks, got bored, stopped seeing the point, and quietly let the membership lapse. This time he bought the glove because his flatmate wouldn't shut up about it.

**Day 1** — He opens the app, pairs the glove, and gets told something he doesn't expect. _"Your first session builds your opponent."_ There's no pressure, no benchmark to hit. He just trains, and the app watches. At the end he sees a rough avatar for the first time — weak looking, minimal gear, barely any aura. The app tells him: _"This is January Jamie. You're going to make him irrelevant."_ He thinks it's a bit corny. He also screenshots it.

**Week 1** — He trains twice. Nothing dramatic. The audio cues during sets are strange at first. But on his third session it tells him _"you slowed down here last time"_ at rep six of a dumbbell row, and he pushes to rep eight out of pure stubbornness. He doesn't think much of it in the moment. But he remembers it on the walk home.

**Week 2** — His consistency gear updates. Small change to the avatar, slightly better armour. He notices. He hasn't missed a session yet and the app reflects that visually without making a big deal of it. He shows his flatmate. His flatmate points out his ghost still looks terrible. Jamie goes to the gym the next morning.

**Week 3** — First real ghost comparison drops. Current Jamie vs Week 1 Jamie on the same exercise. The gap is small but real — three more quality reps at the same weight. At the end of the set the app just says: _"you beat him."_ No fanfare. Just that. He stares at his phone for a second. This is the moment. Not because the progress is huge. Because for the first time the progress is _his_, measured against himself, and he can't argue with it.

**Week 6** — Jamie is training three times a week now. He didn't decide to, it just happened. Some sessions he loses, and the app doesn't punish him for it — it just updates the data. He's stopped thinking about what other people in the gym can lift. He's got his own thing to beat.

**Six Months In** — The six-month ghost appears for the first time. January Jamie, full avatar, standing next to current Jamie. The difference is visible across all three axes: bigger build, full gear set, bright aura. Jamie sends it to his flatmate without saying anything. His flatmate buys a glove the next day.

---

## 🗺️ User Journey

The journey was designed before a single line of code was written. Three core phases:

| Phase                | What Happens                                                                                       |
| -------------------- | -------------------------------------------------------------------------------------------------- |
| **Select & Connect** | Choose your workout. App loads your targets. Put on the glove — everything connects automatically. |
| **Track & Respond**  | Reps counted automatically. App tracks proximity to failure in real time.                          |
| **Review & Evolve**  | Set complete. App adjusts next target automatically. Here's what you achieved.                     |

![User Journey 1](images_new/Ghost_Glove_User_Journey_1.png)
![User Journey 2](images_new/Ghost_Glove_User_Journey_2.png)
![User Journey 3](images_new/Ghost_Glove_User_Journey_3.png)

_Initial concept sketches — 16/03/26_

---

## 🎮 Gamification

The core mechanic: **you compete only against past versions of yourself.** Wins are genuine progress, not arbitrary points.

Your avatar evolves across three axes, each mapped to a real training metric:

| Axis           | What It Measures                                    | Visual Representation        |
| -------------- | --------------------------------------------------- | ---------------------------- |
| **STRONGER**   | Progressive weight increase                         | Physical build / muscle mass |
| **CONSISTENT** | Session attendance & streak                         | Armour quality               |
| **INTENSE**    | Effort per session (velocity, proximity to failure) | Aura / energy                |

The ghost system works across two timescales — a **4-week ghost** (your recent self) and a **6-month ghost** (who you were at the start). Beating one feels like momentum. Beating the other feels like transformation.

![Gamification Idea Sketch](images_new/Gamification_Idea.jpeg)
![Avatar Weightlifting Sketch](images_new/Avatar_Weightlifting_1.PNG)
![Avatar Squash Sketch](images_new/Avatar_Squash_1.PNG)

_Left: Original gamification concept (28/03/26). Right: Sport-specific avatar sketches — the system extends beyond weightlifting._

---

## 🔧 Hardware

Ghost Glove is a fully manufactured smart glove with permanently soldered electronics. The sensor stack:

- **Flex Sensors (×4)** — measure finger bend angle via resistive voltage dividers. Resistor value: 47kΩ (derived from geometric mean ≈ 43.3kΩ — near-optimal for mid-flex sensitivity).
- **MPU-6050 IMU** — 6-DOF accelerometer + gyroscope for wrist orientation and motion. Used for rep counting via Madgwick filter.
- **ADS1115 ADC** — 16-bit external ADC. Resolves the ADC2/WiFi conflict inherent to the ESP32 by handling all analog reads independently.
- **ESP32-C3 Zero** — the brain. Compact, BLE-capable, runs FreeRTOS with separate sensor tasks.

Everything lives on a **5cm × 7cm veroboard**, permanently soldered and integrated into the glove.

![Veroboard Layout](images_new/Vero_Board_Layout.jpg)
![Electronic Schematic](images_new/Electronic_Schematic.png)

_Left: Hand-drawn veroboard layout. Right: EasyEDA schematic — ESP32-C3 Zero + MPU-6050 + ADS1115 + flex sensor voltage dividers._

---

## 🏗️ System Architecture

```
[Flex Sensors] ──┐
                 ├──> [ADS1115 ADC] ──┐
[MPU-6050 IMU] ──┘                    │
                                      ▼
                              [ESP32-C3 Zero]
                              FreeRTOS Tasks:
                              • Sensor read task
                              • IMU read task
                              • MQTT publish task
                                      │
                                      ▼ MQTT over WiFi
                               [HiveMQ Broker]
                                      │
                                      ▼
                              [NeonSQL Database]
                                      │
                                      ▼
                          [Flask API (AWS)] ──> [Web Dashboard]
```

**Data flow validated end-to-end.** Upload frequency: ~0.31 Hz (inter-sample jitter ~237ms from WiFi scheduling). Live web dashboard displays real-time rep counts and sensor readings.

---

## 💻 Software

### Firmware (ESP32-C3 / Arduino)

- **FreeRTOS** task architecture — separate threads for IMU read, ADC read, and MQTT publish
- **Madgwick filter** for orientation estimation from raw IMU data
- **I2C bus** shared between MPU-6050 and ADS1115
- **MQTT** publish to HiveMQ cloud broker

### Backend & Data

- **HiveMQ** — MQTT broker (cloud)
- **NeonSQL** — PostgreSQL-compatible serverless database
- **Flask API** — hosted on AWS, bridges MQTT data to the web dashboard

### Dashboard

- Live web interface showing rep counts and sensor readings in real time

---

## 📊 Results

| Metric                | Result                                                     |
| --------------------- | ---------------------------------------------------------- |
| Rep counting accuracy | ~61% (averaged over 4 sets)                                |
| IMU pipeline          | Fully validated — raw accel + gyro data confirmed          |
| Connectivity          | ESP32 → HiveMQ → NeonSQL → Flask → Dashboard ✅            |
| Upload frequency      | ~0.31 Hz                                                   |
| Glove manufacture     | Veroboard permanently soldered and integrated ✅           |
| Flex sensors          | Hardware fault under investigation — returning null values |

**Works reliably on slow, controlled reps.** Fast or jerky movements cause false positives due to threshold sensitivity — threshold tuning for dynamic rep detection is the primary in-progress item.

---

## 🎨 Design System

The app has a defined visual language built to feel like a training tool, not a health tracker.

![Stlye Guide](images_new/Style_Guide.png)

| Token                    | Value         |
| ------------------------ | ------------- |
| Primary (Electric Green) | `#39FF6A`     |
| Background               | `#111310`     |
| Secondary                | `#1F2E22`     |
| Neutral (Muted Sage)     | `#8A9E8D`     |
| Warning                  | `#FF4444`     |
| Primary Font             | Space Grotesk |
| Secondary Font           | Space Mono    |

_Space Grotesk tells the story. Space Mono delivers the data. The scale keeps every screen from having more than one thing shouting at you at once._

---

## 🔮 Future Work

### Hardware

- [ ] Resolve flex sensor hardware fault — investigate null value root cause
- [ ] Custom PCB to replace veroboard — reduce enclosure size
- [ ] Piezoresistive TPU filament as alternative flex sensing material
- [ ] Pressure Sensor Design 2 — per-finger air bladder system, thin-profile construction

![Pressure Sensor Design](images_new/Pressure_Sensor_Design.PNG)

_V3 concept: per-finger air bladders with joint-level pressure sensing — each sized differently, running to a wrist-mounted data capture unit._

### Software

- [ ] Threshold tuning for dynamic rep detection
- [ ] Matrix profiling for weight estimation from sensor data
- [ ] Ghost avatar system (4-week + 6-month comparisons)
- [ ] Mobile app (React Native) — _Hale_ health score integration
- [ ] BLE transport (replacing WiFi/MQTT) for lower latency

---

## 📋 Academic Context

This project was submitted as a Final Year Project for the MEng Mechatronic and Robotic Engineering degree at the University of Birmingham, under the supervision of **Dr Mahvish Nazir**.

![FYP Poster](images_new/Final_Year_Project_Poster.png)

**TRL Assessment: TRL 3** — subsystems validated independently. Simultaneous flex sensor and IMU transmission identified as the key hardware blocker preventing TRL 4.

**Project management:** Notion Kanban board with MoSCoW prioritisation. Every feature, issue, research paper, and task tracked across Not Started / In Progress / Complete.

---

## 📚 References

1. Krutz P, et al. _IMU Data-based Recognition for Sports Exercises._ Sensors & Transducers. 2023.
2. Zhang S, et al. _A method for obtaining barbell velocity and displacement and motion counting based on IMU._ Mobile Networks and Applications. 2024.
3. Zou Y, et al. _A low-cost smart glove system for real-time fitness coaching._ IEEE IoT Journal. 2020.
4. Aslam MW, et al. _Gym exercises monitoring with smart gloves._ ICMLC. 2023.
5. Zhou G, et al. _Investigating gripping force during lifting tasks using a pressure sensing glove._ Applied Ergonomics. 2023.
6. Lin BS, et al. _Novel assembled sensorized glove platform for comprehensive hand function assessment._ IEEE Sensors Journal. 2019.

---

## 👨‍💻 Author

**Florian Mealing** — MEng Mechatronic and Robotic Engineering, University of Birmingham (2022–2026)

- 🌐 [florianmealing.com](https://florianmealing.com)
- 💼 [LinkedIn](https://linkedin.com/in/florianmealing)
- 📺 [YouTube] (https://www.youtube.com/@florianmealing)

---

![Logo](images_new/Logo.png)
By Mealing Labs
