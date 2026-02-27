#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>

Adafruit_MPU6050 mpu;

// Flex sensor pins
const int flex_pin_1 = 26;
const int flex_pin_2 = 25;
const int flex_pin_3 = 14;
const int flex_pin_4 = 15;

// I2C Connections
const int SDA_Pin = 23;
const int SCL_Pin = 22;

void setup() {
  Serial.begin(115200);
  delay(1000);

  Wire.begin(SDA_Pin, SCL_Pin);

  if (!mpu.begin(0x68)) {
    Serial.println("Failed to find MPU6050!");
    while (1);
  }

  Serial.println("MPU6050 Found!");
}

void loop() {

  // -------- FLEX SENSORS --------
  int value_1 = analogRead(flex_pin_1);
  int value_2 = analogRead(flex_pin_2);
  int value_3 = analogRead(flex_pin_3);
  int value_4 = analogRead(flex_pin_4);

  // -------- IMU DATA --------
  sensors_event_t a, g, temp;
  mpu.getEvent(&a, &g, &temp);

  // -------- PRINT FLEX --------
  Serial.print("Flex: ");
  Serial.print(value_1); Serial.print(", ");
  Serial.print(value_2); Serial.print(", ");
  Serial.print(value_3); Serial.print(", ");
  Serial.print(value_4);

  // -------- PRINT IMU --------
  Serial.print(" | Accel (m/s^2): ");
  Serial.print(a.acceleration.x); Serial.print(", ");
  Serial.print(a.acceleration.y); Serial.print(", ");
  Serial.print(a.acceleration.z);

  Serial.print(" | Gyro (rad/s): ");
  Serial.print(g.gyro.x); Serial.print(", ");
  Serial.print(g.gyro.y); Serial.print(", ");
  Serial.println(g.gyro.z);

  delay(200);
}
