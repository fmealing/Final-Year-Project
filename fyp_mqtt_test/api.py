import os
from pathlib import Path

import psycopg2
import psycopg2.extras
from flask import Flask, jsonify, request
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

DB_URL = os.environ["DATABASE_URL"]

app = Flask(__name__)


def query_db(query, args=(), one=False):
    conn = psycopg2.connect(DB_URL, cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        cur = conn.cursor()
        cur.execute(query, args)
        rows = cur.fetchall()
        return (rows[0] if rows else None) if one else rows
    finally:
        conn.close()


@app.route("/health")
def health():
    return {"status": "ok"}


@app.route("/latest")
def latest():
    row = query_db(
        "SELECT * FROM telemetry ORDER BY id DESC LIMIT 1",
        one=True,
    )
    if not row:
        return jsonify({"error": "no data"}), 404
    return jsonify(dict(row))


@app.route("/last_n")
def last_n():
    n = request.args.get("n", default=50, type=int)
    rows = query_db(
        "SELECT * FROM telemetry ORDER BY id DESC LIMIT %s",
        (n,),
    )
    return jsonify([dict(r) for r in rows])


if __name__ == "__main__":
    app.run(debug=True)
