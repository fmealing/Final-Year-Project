import json
import sqlite3
from datetime import datetime, timezone
import paho.mqtt.client as mqtt

MQTT_HOST = "localhost"
MQTT_PORT = 1883
TOPIC = "fyp/glove/telemetry"

DB_FILE = "telemetry.db"

def init_db():
    con = sqlite3.connect(DB_FILE)
    cur = con.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS telemetry (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            received_utc TEXT,
            device_id TEXT,
            ts_ms INTEGER,
            flex1 INTEGER,
            flex2 INTEGER,
            flex3 INTEGER,
            flex4 INTEGER,
            ax REAL,
            ay REAL,
            az REAL,
            gx REAL,
            gy REAL,
            gz REAL
        )
    """)
    con.commit()
    con.close()

def insert_data(payload):
    con = sqlite3.connect(DB_FILE)
    cur = con.cursor()

    received_utc = datetime.now(timezone.utc).isoformat()

    cur.execute("""
        INSERT INTO telemetry (
            received_utc, device_id, ts_ms,
            flex1, flex2, flex3, flex4,
            ax, ay, az, gx, gy, gz
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        received_utc,
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
        payload["imu"]["gz"]
    ))

    con.commit()
    con.close()

def on_connect(client, userdata, flags, rc):
    print("Connected to broker.")
    client.subscribe(TOPIC)

def on_message(client, userdata, msg):
    payload = json.loads(msg.payload.decode())
    insert_data(payload)
    print("Inserted row.")

init_db()

client = mqtt.Client()
client.on_connect = on_connect
client.on_message = on_message
client.connect(MQTT_HOST, MQTT_PORT, 60)
client.loop_forever()