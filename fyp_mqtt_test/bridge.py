import json
import os
import ssl
from datetime import datetime, timezone
from pathlib import Path

import psycopg2
import paho.mqtt.client as mqtt
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

MQTT_HOST  = os.environ["MQTT_HOST"]
MQTT_PORT  = int(os.environ["MQTT_PORT"])
MQTT_USER  = os.environ["MQTT_USERNAME"]
MQTT_PASS  = os.environ["MQTT_PASSWORD"]
TOPIC      = os.environ.get("MQTT_TOPIC", "fyp/glove/telemetry")
DB_URL     = os.environ["DATABASE_URL"]


def get_conn():
    return psycopg2.connect(DB_URL)


def init_db():
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS telemetry (
            id           SERIAL PRIMARY KEY,
            received_utc TEXT NOT NULL,
            device_id    TEXT,
            ts_ms        BIGINT,
            flex1        INTEGER,
            flex2        INTEGER,
            flex3        INTEGER,
            flex4        INTEGER,
            ax           DOUBLE PRECISION,
            ay           DOUBLE PRECISION,
            az           DOUBLE PRECISION,
            gx           DOUBLE PRECISION,
            gy           DOUBLE PRECISION,
            gz           DOUBLE PRECISION
        )
    """)
    conn.commit()
    conn.close()
    print("DB ready.")


def insert_data(payload):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO telemetry (
            received_utc, device_id, ts_ms,
            flex1, flex2, flex3, flex4,
            ax, ay, az, gx, gy, gz
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """, (
        datetime.now(timezone.utc).isoformat(),
        payload["device_id"],
        payload["ts_ms"],
        payload["flex"][0],
        payload["flex"][1],
        payload["flex"][2],
        payload["flex"][3],
        payload["imu"]["ax"],
        payload["imu"]["ay"],
        payload["imu"]["az"],
        payload["imu"]["gx"],
        payload["imu"]["gy"],
        payload["imu"]["gz"],
    ))
    conn.commit()
    conn.close()


def on_connect(client, userdata, flags, reason_code, properties):
    print(f"Connected to HiveMQ (reason: {reason_code})")
    client.subscribe(TOPIC)


def on_message(client, userdata, msg):
    payload = json.loads(msg.payload.decode())
    insert_data(payload)
    print("Inserted:", payload.get("device_id"), payload.get("ts_ms"))


init_db()

client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
client.username_pw_set(MQTT_USER, MQTT_PASS)
client.tls_set(tls_version=ssl.PROTOCOL_TLS)
client.on_connect = on_connect
client.on_message = on_message
client.connect(MQTT_HOST, MQTT_PORT, 60)
client.loop_forever()
