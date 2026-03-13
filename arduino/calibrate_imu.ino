// calibrate_imu.ino
//
// USAGE:
//   1. Upload this sketch to the ESP32 (NOT sketch.ino).
//   2. Place the glove FLAT and STILL on a table — do not touch it.
//   3. Open Serial Monitor at 115200 baud.
//   4. Copy the printed constants into sketch.ino and apply them (see instructions printed at the end).
//
// The sketch runs once, prints results, then stops.

#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>

#define SDA_PIN     23
#define SCL_PIN     22
#define NUM_SAMPLES 2000   // increase for better accuracy, each sample ~5 ms → ~10 s total
#define WARMUP      200    // discarded samples to let sensor settle

Adafruit_MPU6050 mpu;

void setup() {
  Serial.begin(115200);
  delay(2000);

  Serial.println("╔══════════════════════════════════════╗");
  Serial.println("║       MPU6050 IMU Calibration        ║");
  Serial.println("╚══════════════════════════════════════╝");
  Serial.println();
  Serial.println("► Place the glove FLAT and STILL on a table.");
  Serial.println("► Do NOT touch it during collection.");
  Serial.println("► Starting in 5 seconds...");
  delay(5000);

  Wire.begin(SDA_PIN, SCL_PIN);

  if (!mpu.begin(0x68)) {
    Serial.println("ERROR: MPU6050 not found! Check SDA/SCL wiring.");
    while (1);
  }

  // Match ranges used in sketch.ino
  mpu.setAccelerometerRange(MPU6050_RANGE_2_G);
  mpu.setGyroRange(MPU6050_RANGE_500_DEG);
  mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);
  delay(100);

  // ── Warmup: discard initial noisy samples ──────────────────────────────────
  sensors_event_t a, g, temp;
  Serial.printf("Warming up (%d samples)...\n", WARMUP);
  for (int i = 0; i < WARMUP; i++) {
    mpu.getEvent(&a, &g, &temp);
    delay(5);
  }

  // ── Collection ─────────────────────────────────────────────────────────────
  Serial.printf("Collecting %d samples", NUM_SAMPLES);

  double sum_ax = 0, sum_ay = 0, sum_az = 0;
  double sum_gx = 0, sum_gy = 0, sum_gz = 0;

  for (int i = 0; i < NUM_SAMPLES; i++) {
    mpu.getEvent(&a, &g, &temp);
    sum_ax += a.acceleration.x;
    sum_ay += a.acceleration.y;
    sum_az += a.acceleration.z;
    sum_gx += g.gyro.x;
    sum_gy += g.gyro.y;
    sum_gz += g.gyro.z;
    if (i % 200 == 0) Serial.print(".");
    delay(5);
  }
  Serial.println(" done.");
  Serial.println();

  // ── Compute biases ─────────────────────────────────────────────────────────
  // Accel at rest should read [0, 0, +9.81] m/s² (gravity on Z when flat).
  // Gyro at rest should read [0, 0, 0] rad/s.
  float bias_ax = sum_ax / NUM_SAMPLES;           // should be ~0
  float bias_ay = sum_ay / NUM_SAMPLES;           // should be ~0
  float bias_az = sum_az / NUM_SAMPLES - 9.81f;  // remove gravity; should be ~0
  float bias_gx = sum_gx / NUM_SAMPLES;           // should be ~0
  float bias_gy = sum_gy / NUM_SAMPLES;           // should be ~0
  float bias_gz = sum_gz / NUM_SAMPLES;           // should be ~0

  // ── Raw readings (for diagnostics) ────────────────────────────────────────
  Serial.println("── Raw mean readings ──────────────────────────────────");
  Serial.printf("  Accel (m/s²) : ax=%+.4f  ay=%+.4f  az=%+.4f\n",
                sum_ax / NUM_SAMPLES, sum_ay / NUM_SAMPLES, sum_az / NUM_SAMPLES);
  Serial.printf("  Gyro (rad/s) : gx=%+.4f  gy=%+.4f  gz=%+.4f\n",
                sum_gx / NUM_SAMPLES, sum_gy / NUM_SAMPLES, sum_gz / NUM_SAMPLES);
  Serial.printf("  az deviation from 9.81 m/s²: %+.4f\n", (float)(sum_az / NUM_SAMPLES) - 9.81f);
  Serial.println();

  // ── Paste-ready output ────────────────────────────────────────────────────
  Serial.println("── Paste these into sketch.ino (before setup()) ───────");
  Serial.printf("const float BIAS_AX = %+.4ff;  // m/s²\n", bias_ax);
  Serial.printf("const float BIAS_AY = %+.4ff;  // m/s²\n", bias_ay);
  Serial.printf("const float BIAS_AZ = %+.4ff;  // m/s² (gravity removed)\n", bias_az);
  Serial.printf("const float BIAS_GX = %+.4ff;  // rad/s\n", bias_gx);
  Serial.printf("const float BIAS_GY = %+.4ff;  // rad/s\n", bias_gy);
  Serial.printf("const float BIAS_GZ = %+.4ff;  // rad/s\n", bias_gz);
  Serial.println();

  Serial.println("── Then, in loop() after mpu.getEvent(), add: ─────────");
  Serial.println("  a.acceleration.x -= BIAS_AX;");
  Serial.println("  a.acceleration.y -= BIAS_AY;");
  Serial.println("  a.acceleration.z -= BIAS_AZ;");
  Serial.println("  g.gyro.x         -= BIAS_GX;");
  Serial.println("  g.gyro.y         -= BIAS_GY;");
  Serial.println("  g.gyro.z         -= BIAS_GZ;");
  Serial.println();
  Serial.println("✔ Calibration complete. Re-upload sketch.ino when done.");
}

void loop() {
  // Nothing — calibration is a one-shot operation.
}
