#include <Wire.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>

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
  Serial.println("MPU6050 ready.");

  connectWifi();
}

// ── Loop ──────────────────────────────────────────────────────────────────────
void loop() {
  if (WiFi.status() != WL_CONNECTED) connectWifi();

  // Read flex sensors
  int f1 = analogRead(FLEX_PIN_1);
  int f2 = analogRead(FLEX_PIN_2);
  int f3 = analogRead(FLEX_PIN_3);
  int f4 = analogRead(FLEX_PIN_4);

  // Read IMU
  sensors_event_t a, g, temp;
  mpu.getEvent(&a, &g, &temp);

  // Build JSON payload
  char payload[256];
  snprintf(payload, sizeof(payload),
    "{\"device_id\":\"%s\","
    "\"ts_ms\":%lu,"
    "\"flex\":[%d,%d,%d,%d],"
    "\"imu\":{\"ax\":%.3f,\"ay\":%.3f,\"az\":%.3f,"
             "\"gx\":%.3f,\"gy\":%.3f,\"gz\":%.3f}}",
    DEVICE_ID,
    millis(),
    f1, f2, f3, f4,
    a.acceleration.x, a.acceleration.y, a.acceleration.z,
    g.gyro.x, g.gyro.y, g.gyro.z
  );

  // POST to API
  WiFiClientSecure client;
  client.setInsecure();  // skip cert verification for simplicity

  HTTPClient http;
  http.begin(client, INGEST_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("ngrok-skip-browser-warning", "true");
  int code = http.POST(payload);
  Serial.printf("POST %d: %s\n", code, payload);
  http.end();

  delay(200);  // 5 Hz
}