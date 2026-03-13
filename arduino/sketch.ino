#include <Wire.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include "rep_counting.h"

// ── WiFi / API ─────────────────────────────────────────────────────────────
const char* WIFI_SSID  = "Florian";
const char* WIFI_PASS  = "password";
const char* INGEST_URL = "https://glove-trainer-api.onrender.com/ingest";
const char* DEVICE_ID  = "glove_01";

// ── Pin assignments ────────────────────────────────────────────────────────
const int FLEX_PIN_1 = 26;
const int FLEX_PIN_2 = 25; 
const int FLEX_PIN_3 = 14; 
const int FLEX_PIN_4 = 15;
const int SDA_PIN = 23;
const int SCL_PIN = 22;

// ── IMU bias corrections (from calibrate_imu.ino) ─────────────────────────
// Subtract from raw readings to remove systematic sensor offset.
const float BIAS_AX = -2.6284f;
const float BIAS_AY = -0.2492f;
const float BIAS_AZ = -0.0144f;
const float BIAS_GX = -0.1175f;
const float BIAS_GY =  0.0457f;
const float BIAS_GZ = -0.0043f;

// ── Shared state ───────────────────────────────────────────────────────────
// sensorTask writes this every 20 ms; postTask reads it every 1 s.
// A mutex (g_mutex) ensures neither task reads a half-written struct.
struct Snapshot {
    int   rep_count;
    int   flex[4];
    float ax, ay, az, gx, gy, gz;
    unsigned long ts_ms;
};
static Snapshot          g_snap  = {};
static SemaphoreHandle_t g_mutex;   // created in setup(), used by both tasks


// ══════════════════════════════════════════════════════════════════════════
//  CORE 1 — Sensor sampling + rep counting at 50 Hz
//
//  This task NEVER touches the network, so it is never blocked by a slow
//  HTTP call. vTaskDelayUntil() keeps it waking every exactly 20 ms even
//  if the loop body takes a variable amount of time.
// ══════════════════════════════════════════════════════════════════════════
static void sensorTask(void* /*param*/) {
    // Init I2C and IMU inside the task so they run on Core 1
    Wire.begin(SDA_PIN, SCL_PIN);
    Adafruit_MPU6050 mpu;
    while (!mpu.begin(0x68)) {
        Serial.println("MPU6050 not found, retrying…");
        vTaskDelay(pdMS_TO_TICKS(500));
    }
    mpu.setAccelerometerRange(MPU6050_RANGE_2_G);   // ±2g  → 19.62 m/s²
    mpu.setGyroRange(MPU6050_RANGE_500_DEG);        // ±500 °/s → ±8.73 rad/s
    Serial.println("MPU6050 ready.");

    // ── Algorithm state — lives entirely inside this task, no sharing needed
    LowPassFilter  lpf    = {{}, false};
    HighPassFilter vm_hpf = {0.0f, 0.0f, false};  // removes DC bias from VM signal
    SlidingWindow  window = {{}, 0, 0};
    MotionLog      mlog   = {{}, 0};

    // Rep detection thresholds (in m/s² — VM signal units)
    const float VM_HIGH =  1.5f;
    const float VM_LOW  = -1.5f;

    int   rep_count    = 0;
    int   MIDSV        = 0;     // Motion Interval Detection State Variable
    int   MCSV         = 0;     // Motion Counting State Variable
    int   consec_above = 0, consec_below = 0;
    float prev_vm      = 0.0f, prev_prev_vm = 0.0f;
    unsigned long motion_start_ms = 0;
    unsigned long rep_start_ms    = 0, rep_deepest_ms = 0;
    unsigned long last_ms         = 0;

    // xLastWakeTime is the reference point for vTaskDelayUntil.
    // Each call advances it by xFrequency, so we always wake exactly 20 ms
    // after the previous wake — regardless of how long the body took.
    TickType_t xLastWakeTime = xTaskGetTickCount();

    for (;;) {
        vTaskDelayUntil(&xLastWakeTime, pdMS_TO_TICKS(20));  // precise 50 Hz

        unsigned long now = millis();
        float dt = (last_ms == 0) ? 0.02f : (now - last_ms) / 1000.0f;
        last_ms = now;

        // ── Read sensors ───────────────────────────────────────────────────
        int f1 = analogRead(FLEX_PIN_1), f2 = analogRead(FLEX_PIN_2);
        int f3 = analogRead(FLEX_PIN_3), f4 = analogRead(FLEX_PIN_4);

        sensors_event_t a, g, temp;
        mpu.getEvent(&a, &g, &temp);

        // ── Rep algorithm: LPF → VM → HPF ─────────────────────────────────
        //
        // Old approach: acc → vel (integrate) → disp (integrate again)
        //   Problem: two integrations accumulate drift, giving 10m displacements.
        //
        // New approach: VM = |acc_vector| − 9.81
        //   |acc| = 9.81 m/s² at rest (pure gravity). During motion it rises/falls.
        //   Subtracting 9.81 centres it on zero. No integration → no drift.
        //   The HPF (0.5 Hz) removes any residual DC offset from sensor bias.

        ImuData raw;
        raw.time_ms = now;
        raw.acc  = {a.acceleration.x, a.acceleration.y, a.acceleration.z};
        raw.gyro = {g.gyro.x, g.gyro.y, g.gyro.z};

        ImuData filt  = applyLowPassFilter(raw, lpf);          // smooth noise (10 Hz)
        float vm_raw  = computeVMAccel(filt);                  // |acc| − 9.81 m/s²
        float vm      = applyHighPassFilter(vm_raw, dt, 0.5f, vm_hpf);  // remove DC

        addSample(window, vm);
        float variance = computeVariance(window);

        // ── MIDSV: gate rep counting to active-motion periods ──────────────
        if (MIDSV == 0) {
            consec_above = (variance > VAR_THRESHOLD) ? consec_above + 1 : 0;
            if (consec_above >= 10) {
                motion_start_ms = now;
                MIDSV = 1;
                consec_above = 0;
            }
        } else {
            consec_below = (variance < VAR_THRESHOLD) ? consec_below + 1 : 0;
            if (consec_below >= 5) {
                recordMotionInterval(mlog, motion_start_ms, now);
                MIDSV = 0;
                consec_below = 0;
            }
        }

        // ── MCSV: count reps as peak → trough → peak cycles in VM ─────────
        //
        // During a curl: the hand accelerates up (VM +ve spike), decelerates
        // at the top (VM −ve trough), then accelerates back down (VM +ve again).
        // State machine captures exactly that two-peak / one-trough signature.

        bool is_local_max = (prev_vm > prev_prev_vm) && (prev_vm > vm);
        bool is_local_min = (prev_vm < prev_prev_vm) && (prev_vm < vm);
        bool in_motion    = (MIDSV == 1);

        if (!in_motion) {
            MCSV = 0;   // motion stopped — reset so we don't count stale peaks
        } else if (MCSV == 0 && is_local_max && prev_vm > 0.3f * VM_HIGH) {
            rep_start_ms = now;
            MCSV = 1;
        } else if (MCSV == 1 && is_local_min && prev_vm < 0.3f * VM_LOW) {
            rep_deepest_ms = now;
            MCSV = 2;
        } else if (MCSV == 2 && is_local_max && prev_vm > 0.3f * VM_HIGH) {
            if (rep_deepest_ms > rep_start_ms && now > rep_deepest_ms) {
                rep_count++;
                Serial.printf("[REP] Count: %d\n", rep_count);
            }
            MCSV = 0;
        }

        prev_prev_vm = prev_vm;
        prev_vm      = vm;

        // ── Publish snapshot for postTask ──────────────────────────────────
        // xSemaphoreTake with timeout 0 means "grab the lock only if it is
        // free right now — otherwise skip". This guarantees we never stall
        // the 50 Hz loop waiting for the POST task to release the mutex.
        if (xSemaphoreTake(g_mutex, 0) == pdTRUE) {
            g_snap.rep_count = rep_count;
            g_snap.flex[0]   = f1;  g_snap.flex[1] = f2;
            g_snap.flex[2]   = f3;  g_snap.flex[3] = f4;
            g_snap.ax = a.acceleration.x; g_snap.ay = a.acceleration.y; g_snap.az = a.acceleration.z;
            g_snap.gx = g.gyro.x;         g_snap.gy = g.gyro.y;         g_snap.gz = g.gyro.z;
            g_snap.ts_ms = now;
            xSemaphoreGive(g_mutex);
        }
        // If the lock was held by postTask we simply skip this update — the
        // next cycle (20 ms later) will write fresh data. No data loss for
        // the algorithm; postTask just sees a slightly stale snapshot.
    }
}


// ══════════════════════════════════════════════════════════════════════════
//  CORE 0 — HTTP POST at 1 Hz
//
//  This task is allowed to block for as long as the network needs.
//  It runs on Core 0 alongside the ESP32 WiFi stack, which is the
//  recommended placement for any network code.
// ══════════════════════════════════════════════════════════════════════════
static void postTask(void* /*param*/) {

    // Connect to WiFi (blocking — fine here because sensorTask is already
    // running independently on Core 1)
    WiFi.begin(WIFI_SSID, WIFI_PASS);
    while (WiFi.status() != WL_CONNECTED) {
        vTaskDelay(pdMS_TO_TICKS(500));
    }
    Serial.printf("WiFi connected — IP: %s\n", WiFi.localIP().toString().c_str());

    for (;;) {
        vTaskDelay(pdMS_TO_TICKS(1000));    // transmit once per second

        // Reconnect if the network dropped
        if (WiFi.status() != WL_CONNECTED) {
            WiFi.begin(WIFI_SSID, WIFI_PASS);
            while (WiFi.status() != WL_CONNECTED) vTaskDelay(pdMS_TO_TICKS(500));
        }

        // Take a local copy of the shared snapshot under the mutex.
        // We hold the lock for only the few microseconds it takes to copy
        // the struct — the slow HTTP POST happens after we release it.
        Snapshot snap;
        if (xSemaphoreTake(g_mutex, pdMS_TO_TICKS(10)) != pdTRUE) {
            continue;   // couldn't get lock in 10 ms — skip this cycle
        }
        snap = g_snap;          // struct copy (fast)
        xSemaphoreGive(g_mutex);

        // Build JSON payload and POST (this may take 200–2000 ms — that is
        // fine because sensorTask on Core 1 keeps sampling unaffected)
        char payload[256];
        snprintf(payload, sizeof(payload),
            "{\"device_id\":\"%s\","
            "\"ts_ms\":%lu,"
            "\"flex\":[%d,%d,%d,%d],"
            "\"rep_count\":%d,"
            "\"imu\":{\"ax\":%.3f,\"ay\":%.3f,\"az\":%.3f,"
                     "\"gx\":%.3f,\"gy\":%.3f,\"gz\":%.3f}}",
            DEVICE_ID,
            snap.ts_ms,
            snap.flex[0], snap.flex[1], snap.flex[2], snap.flex[3],
            snap.rep_count,
            snap.ax, snap.ay, snap.az,
            snap.gx, snap.gy, snap.gz);

        WiFiClientSecure client;
        client.setInsecure();
        HTTPClient http;
        http.begin(client, INGEST_URL);
        http.addHeader("Content-Type", "application/json");
        http.addHeader("ngrok-skip-browser-warning", "true");
        int code = http.POST(payload);
        Serial.printf("POST %d: %s\n", code, payload);
        http.end();
    }
}


// ══════════════════════════════════════════════════════════════════════════
//  Setup — runs once, then both tasks take over
// ══════════════════════════════════════════════════════════════════════════
void setup() {
    Serial.begin(115200);
    delay(1000);

    // Create the mutex before spawning tasks (both tasks need it from the start)
    g_mutex = xSemaphoreCreateMutex();

    // xTaskCreatePinnedToCore(function, name, stack bytes, param, priority, handle, core)
    //   priority 2 > priority 1, so sensorTask preempts postTask if both are ready
    //   Core 1 = application CPU (where Arduino normally runs)
    //   Core 0 = protocol CPU (WiFi stack lives here — pair it with postTask)
    xTaskCreatePinnedToCore(sensorTask, "sensor", 4096, NULL, 2, NULL, 1);
    xTaskCreatePinnedToCore(postTask,   "post",   8192, NULL, 1, NULL, 0);
}

void loop() {
    // Intentionally empty — both tasks run in their own infinite loops above.
    // vTaskDelay prevents the idle watchdog from triggering on Core 1.
    vTaskDelay(pdMS_TO_TICKS(1000));
}
