import json
import time
import random
import paho.mqtt.client as mqtt

MQTT_HOST = "localhost"
MQTT_PORT = 1883
TOPIC = "fyp/glove/telemetry"

client = mqtt.Client()
client.connect(MQTT_HOST, MQTT_PORT, 60)

print("Fake glove publishing...")

while True:
    payload = {
        "device_id": "glove_01",
        "ts_ms": int(time.time() * 1000),
        "flex": [
            random.randint(1000, 2000),
            random.randint(1000, 2000),
            random.randint(1000, 2000),
            random.randint(1000, 2000),
        ],
        "imu": {
            "ax": random.uniform(-1, 1),
            "ay": random.uniform(-1, 1),
            "az": random.uniform(0.8, 1.2),
            "gx": random.uniform(-2, 2),
            "gy": random.uniform(-2, 2),
            "gz": random.uniform(-2, 2),
        }
    }

    client.publish(TOPIC, json.dumps(payload))
    print("Published:", payload)
    time.sleep(0.2)   # 5 Hz