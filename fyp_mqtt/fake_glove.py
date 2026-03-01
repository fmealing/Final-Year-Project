# TODO: Implement this with the ESP32 on Monday

import json
import os
import random
import ssl
import time
from pathlib import Path

import paho.mqtt.client as mqtt
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

MQTT_HOST = os.environ["MQTT_HOST"]
MQTT_PORT = int(os.environ["MQTT_PORT"])
MQTT_USER = os.environ["MQTT_USERNAME"]
MQTT_PASS = os.environ["MQTT_PASSWORD"]
TOPIC     = os.environ.get("MQTT_TOPIC", "fyp/glove/telemetry")

client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
client.username_pw_set(MQTT_USER, MQTT_PASS)
client.tls_set(tls_version=ssl.PROTOCOL_TLS)
client.connect(MQTT_HOST, MQTT_PORT, 60)
client.loop_start()

print(f"Fake glove publishing to {MQTT_HOST}:{MQTT_PORT} → {TOPIC}")

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
        },
    }
    client.publish(TOPIC, json.dumps(payload))
    print("Published:", payload["ts_ms"])
    time.sleep(0.2)  # 5 Hz
