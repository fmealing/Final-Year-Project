#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_ADS1X15.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include "rep_counting.h"

// ── Ghost Glove BLE UUIDs ──────────────────────────────────────────────────
#define GLOVE_SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define GLOVE_CHARACTERISTIC_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a8"

// ── Pins ───────────────────────────────────────────────────────────────────
const int SDA_PIN = 1;
const int SCL_PIN = 0;

// ── Peripherals ────────────────────────────────────────────────────────────
Adafruit_MPU6050 mpu;
Adafruit_ADS1115 ads;
BLECharacteristic* pCharacteristic = nullptr;

// ── Session state ──────────────────────────────────────────────────────────
bool     deviceConnected = false;
uint32_t sessionStart    = 0;
uint32_t repCount        = 0;

// ── BLE connection callbacks ───────────────────────────────────────────────
class ServerCallbacks : public BLEServerCallbacks {
    void onConnect(BLEServer* pServer) override {
        deviceConnected = true;
        sessionStart    = millis();
        repCount        = 0;
        Serial.println("[BLE] Client connected — session started");
    }
    void onDisconnect(BLEServer* pServer) override {
        deviceConnected = false;
        Serial.println("[BLE] Client disconnected — restarting advertising");
        BLEDevice::startAdvertising();
    }
};

// ── Packet helpers (little-endian) ────────────────────────────────────────
static void packFloat(uint8_t* buf, int offset, float val) {
    memcpy(buf + offset, &val, 4);
}
static void packUint32(uint8_t* buf, int offset, uint32_t val) {
    memcpy(buf + offset, &val, 4);
}

// ── Setup ──────────────────────────────────────────────────────────────────
void setup() {
    Serial.begin(115200);
    while (!Serial) delay(10);
    Wire.begin(SDA_PIN, SCL_PIN);

    // MPU6050
    if (!mpu.begin(0x68)) {
        Serial.println("[ERROR] MPU6050 not found!");
        while (1) delay(10);
    }
    mpu.setAccelerometerRange(MPU6050_RANGE_2_G);
    mpu.setGyroRange(MPU6050_RANGE_500_DEG);
    mpu.setFilterBandwidth(MPU6050_BAND_10_HZ);
    Serial.println("[OK] MPU6050 ready");

    // ADS1115
    if (!ads.begin(0x48)) {
        Serial.println("[ERROR] ADS1115 not found!");
        while (1) delay(10);
    }
    ads.setGain(GAIN_ONE);
    ads.setDataRate(RATE_ADS1115_860SPS);
    Serial.println("[OK] ADS1115 ready");

    // BLE
    BLEDevice::init("GhostGlove");
    BLEServer* pServer = BLEDevice::createServer();
    pServer->setCallbacks(new ServerCallbacks());

    BLEService* pService = pServer->createService(GLOVE_SERVICE_UUID);
    pCharacteristic = pService->createCharacteristic(
        GLOVE_CHARACTERISTIC_UUID,
        BLECharacteristic::PROPERTY_NOTIFY
    );
    pCharacteristic->addDescriptor(new BLE2902());
    pService->start();

    BLEAdvertising* pAdvertising = BLEDevice::getAdvertising();
    pAdvertising->addServiceUUID(GLOVE_SERVICE_UUID);
    pAdvertising->setScanResponse(true);
    BLEDevice::startAdvertising();
    Serial.println("[OK] BLE advertising as 'GhostGlove'");

    Serial.println("\n--- Live Readings (~50 Hz) ---");
}

// ── Loop ───────────────────────────────────────────────────────────────────
void loop() {
    // Read IMU
    sensors_event_t a, g, temp;
    mpu.getEvent(&a, &g, &temp);

    // Build ImuData and run full rep-counting pipeline
    ImuData raw;
    raw.acc     = {a.acceleration.x, a.acceleration.y, a.acceleration.z};
    raw.gyro    = {g.gyro.x, g.gyro.y, g.gyro.z};
    raw.time_ms = millis();

    repCount = updateRepCount(raw);

    // Read flex sensors (ADS1115 raw 16-bit counts, cast to float for BLE packet)
    float v0 = (float)ads.readADC_SingleEnded(0);
    float v1 = (float)ads.readADC_SingleEnded(1);
    float v2 = (float)ads.readADC_SingleEnded(2);
    float v3 = (float)ads.readADC_SingleEnded(3);

    // Build 48-byte BLE packet (little-endian)
    // Offsets:  0–11  accel x/y/z (float32, m/s²)
    //          12–23  gyro  x/y/z (float32, rad/s)
    //          24–39  flex  1–4   (float32, raw 16-bit ADC counts)
    //          40–43  rep_count   (uint32)
    //          44–47  timestamp   (uint32, ms since session start)
    uint8_t packet[48];
    packFloat(packet,  0, a.acceleration.x);
    packFloat(packet,  4, a.acceleration.y);
    packFloat(packet,  8, a.acceleration.z);
    packFloat(packet, 12, g.gyro.x);
    packFloat(packet, 16, g.gyro.y);
    packFloat(packet, 20, g.gyro.z);
    packFloat(packet, 24, v0);
    packFloat(packet, 28, v1);
    packFloat(packet, 32, v2);
    packFloat(packet, 36, v3);
    packUint32(packet, 40, repCount);
    packUint32(packet, 44, millis() - sessionStart);

    // Notify connected client
    if (deviceConnected) {
        pCharacteristic->setValue(packet, 48);
        pCharacteristic->notify();
    }

    // Serial debug
    Serial.printf("ACC  (m/s²) │ ax: %7.3f  ay: %7.3f  az: %7.3f\n",
        a.acceleration.x, a.acceleration.y, a.acceleration.z);
    Serial.printf("GYRO (rad/s)│ gx: %7.3f  gy: %7.3f  gz: %7.3f\n",
        g.gyro.x, g.gyro.y, g.gyro.z);
    Serial.printf("FLEX (raw)  │ A0: %.0f  A1: %.0f  A2: %.0f  A3: %.0f\n",
        v0, v1, v2, v3);
    Serial.printf("REP COUNT   │ %u  [%s]\n",
        repCount, deviceConnected ? "BLE connected" : "advertising");

    delay(20);  // ~50 Hz
}
