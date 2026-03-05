import logging
import os
from pathlib import Path

import psycopg2
import psycopg2.extras
from flask import Flask, jsonify, request
from dotenv import load_dotenv

logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger(__name__)

load_dotenv(Path(__file__).parent / ".env")

DB_URL = os.environ.get("DATABASE_URL")
log.info("DATABASE_URL = %s", DB_URL)

app = Flask(__name__)


def query_db(query, args=(), one=False):
    log.debug("query_db: query=%r args=%r", query, args)
    try:
        conn = psycopg2.connect(DB_URL, cursor_factory=psycopg2.extras.RealDictCursor)
    except Exception as e:
        log.error("DB connection failed: %s", e)
        raise
    try:
        cur = conn.cursor()
        cur.execute(query, args)
        rows = cur.fetchall()
        log.debug("query_db: got %d row(s)", len(rows))
        return (rows[0] if rows else None) if one else rows
    except Exception as e:
        log.error("DB query failed: %s", e)
        raise
    finally:
        conn.close()


@app.route("/ingest", methods=["POST"])
def ingest():
    body = request.get_json(silent=True)
    log.info("POST /ingest payload=%r", body)
    if not body:
        log.warning("/ingest: empty or invalid JSON")
        return jsonify({"error": "invalid JSON"}), 400
    try:
        flex = body.get("flex", [None, None, None, None])
        imu  = body.get("imu", {})
        conn = psycopg2.connect(DB_URL)
        cur  = conn.cursor()
        cur.execute("""
            INSERT INTO telemetry (
                received_utc, device_id, ts_ms,
                flex1, flex2, flex3, flex4,
                ax, ay, az, gx, gy, gz
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(),
            body.get("device_id"),
            body.get("ts_ms"),
            flex[0], flex[1], flex[2], flex[3],
            imu.get("ax"), imu.get("ay"), imu.get("az"),
            imu.get("gx"), imu.get("gy"), imu.get("gz"),
        ))
        conn.commit()
        conn.close()
        log.info("/ingest: inserted row for device=%s", body.get("device_id"))
        return jsonify({"status": "ok"}), 201
    except Exception as e:
        log.error("/ingest error: %s", e)
        return jsonify({"error": str(e)}), 500


@app.route("/health")
def health():
    log.info("GET /health")
    return {"status": "ok"}


@app.route("/latest")
def latest():
    log.info("GET /latest")
    try:
        row = query_db(
            "SELECT * FROM telemetry ORDER BY id DESC LIMIT 1",
            one=True,
        )
    except Exception as e:
        log.error("/latest error: %s", e)
        return jsonify({"error": str(e)}), 500
    if not row:
        log.warning("/latest: no data in DB")
        return jsonify({"error": "no data"}), 404
    log.debug("/latest returning row id=%s", row.get("id"))
    return jsonify(dict(row))


@app.route("/last_n")
def last_n():
    n = request.args.get("n", default=50, type=int)
    log.info("GET /last_n n=%d", n)
    try:
        rows = query_db(
            "SELECT * FROM telemetry ORDER BY id DESC LIMIT %s",
            (n,),
        )
    except Exception as e:
        log.error("/last_n error: %s", e)
        return jsonify({"error": str(e)}), 500
    log.debug("/last_n returning %d rows", len(rows))
    return jsonify([dict(r) for r in rows])


if __name__ == "__main__":
    log.info("Starting Flask API")
    app.run(debug=True)
