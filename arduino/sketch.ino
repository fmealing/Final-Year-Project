#include <Wire.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include "rep_counting.h"

// ── WiFi credentials ──────────────────────────────────────────────────────────
const char* WIFI_SSID     = "Florian";
const char* WIFI_PASSWORD = "password";

// ── API endpoint ──────────────────────────────────────────────────────────────
const char* INGEST_URL = "https://glove-trainer-api.onrender.com/ingest";
const char* DEVICE_ID  = "glove_01";

// ── Pin assignments ───────────────────────────────────────────────────────────
const int FLEX_PIN_1 = 26;
const int FLEX_PIN_2 = 25;
const int FLEX_PIN_3 = 14;
const int FLEX_PIN_4 = 15;
const int SDA_PIN    = 23;
const int SCL_PIN    = 22;

// ── Globals ───────────────────────────────────────────────────────────────────
Adafruit_MPU6050 mpu;

// ── Rep analysis state (persists between loop() calls) ───────────────────────
LowPassFilter   lpf         = {{}, false};
Integrator      vel_int     = {0.0f, false};
Integrator      disp_int    = {0.0f, false};
HighPassFilter  vel_hpf     = {0.0f, 0.0f, false};
HighPassFilter  disp_hpf    = {0.0f, 0.0f, false};
SlidingWindow   window      = {{}, 0, 0};
MotionLog       mlog        = {{}, 0};

const float MAX_THRESHOLD   = 0.15f;
const float MIN_THRESHOLD   = -0.15f;

int   MIDSV             = 0;
int   consec_above      = 0;
int   consec_below      = 0;
unsigned long motion_start_ms = 0;

int   MCSV              = 0;
int   rep_count         = 0;
float prev_disp         = 0.0f;
float prev_prev_disp    = 0.0f;
unsigned long rep_start_ms   = 0;
unsigned long rep_deepest_ms = 0;
unsigned long last_sample_ms = 0;

// ── WiFi connect ──────────────────────────────────────────────────────────────
void connectWifi() {
  Serial.printf("Connecting to WiFi: %s", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.printf("\nWiFi connected — IP: %s\n", WiFi.localIP().toString().c_str());
}

// ── Setup ─────────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(1000);

  Wire.begin(SDA_PIN, SCL_PIN);

  if (!mpu.begin(0x68)) {
    Serial.println("ERROR: MPU6050 not found!");
    while (1);
  }
  // Explicitly set sensor ranges
  mpu.setAccelerometerRange(MPU6050_RANGE_2_G);   // ±2g  → 19.62 m/s²
  mpu.setGyroRange(MPU6050_RANGE_500_DEG);        // ±500 deg/s → ±8.73 rad/s
  Serial.println("MPU6050 ready.");

  connectWifi();
}

// ── Loop ──────────────────────────────────────────────────────────────────────
void loop() {
  if (WiFi.status() != WL_CONNECTED) connectWifi();

  // ── Read sensors ────────────────────────────────────────────────────────────
  int f1 = analogRead(FLEX_PIN_1);
  int f2 = analogRead(FLEX_PIN_2);
  int f3 = analogRead(FLEX_PIN_3);
  int f4 = analogRead(FLEX_PIN_4);

  sensors_event_t a, g, temp;
  mpu.getEvent(&a, &g, &temp);

  // ── Rep analysis (one sample at a time) ─────────────────────────────────────
  unsigned long now = millis();
  float dt = (last_sample_ms == 0) ? 0.02f : (now - last_sample_ms) / 1000.0f;
  last_sample_ms = now;

  ImuData raw;
  raw.time_ms = now;
  raw.acc  = { a.acceleration.x, a.acceleration.y, a.acceleration.z };
  raw.gyro = { g.gyro.x, g.gyro.y, g.gyro.z };

  ImuData filtered    = applyLowPassFilter(raw, lpf);
  Vector3 global_acc  = ConvertToGlobalFrame(filtered);
  float vert_acc      = ExtractVerticalComponent(global_acc);

  float velocity      = integrate(vert_acc, dt, vel_int);
  velocity            = applyHighPassFilter(velocity, dt, cutoff_frequency_high_pass, vel_hpf);

  float displacement  = integrate(velocity, dt, disp_int);
  displacement        = applyHighPassFilter(displacement, dt, cutoff_frequency_high_pass, disp_hpf);

  addSample(window, displacement);
  float variance = computeVariance(window);

  // MIDSV — motion interval detection
  if (MIDSV == 0) {
    if (variance > VAR_THRESHOLD) consec_above++;
    else consec_above = 0;
    if (consec_above >= 10) {
      motion_start_ms = now;
      MIDSV = 1;
      consec_above = 0;
    }
  } else if (MIDSV == 1) {
    if (variance < VAR_THRESHOLD) consec_below++;
    else consec_below = 0;
    if (consec_below >= 5) {
      recordMotionInterval(mlog, motion_start_ms, now);
      MIDSV = 0;
      consec_below = 0;
    }
  }

  // MCSV — rep counting
  bool is_local_max = (prev_disp > prev_prev_disp) && (prev_disp > displacement);
  bool is_local_min = (prev_disp < prev_prev_disp) && (prev_disp < displacement);

  if (MCSV == 0 && is_local_max && prev_disp > 0.3f * MAX_THRESHOLD) {
    rep_start_ms = now;
    MCSV = 1;
  } else if (MCSV == 1 && is_local_min && prev_disp < 0.3f * MIN_THRESHOLD) {
    rep_deepest_ms = now;
    MCSV = 2;
  } else if (MCSV == 2 && is_local_max && prev_disp > 0.3f * MAX_THRESHOLD) {
    if (rep_deepest_ms > rep_start_ms && now > rep_deepest_ms) {
      rep_count++;
      Serial.printf("[REP] Count: %d\n", rep_count);
    }
    MCSV = 0;
  }

  prev_prev_disp = prev_disp;
  prev_disp = displacement;

  // ── POST to API ─────────────────────────────────────────────────────────────
  char payload[256];
  snprintf(payload, sizeof(payload),
    "{\"device_id\":\"%s\","
    "\"ts_ms\":%lu,"
    "\"flex\":[%d,%d,%d,%d],"
    "\"rep_count\":%d,"
    "\"imu\":{\"ax\":%.3f,\"ay\":%.3f,\"az\":%.3f,"
             "\"gx\":%.3f,\"gy\":%.3f,\"gz\":%.3f}}",
    DEVICE_ID,
    now,
    f1, f2, f3, f4,
    rep_count,
    a.acceleration.x, a.acceleration.y, a.acceleration.z,
    g.gyro.x, g.gyro.y, g.gyro.z
  );

  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;
  http.begin(client, INGEST_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("ngrok-skip-browser-warning", "true");
  int code = http.POST(payload);
  Serial.printf("POST %d: %s\n", code, payload);
  http.end();

  delay(20);  // 50 Hz
}