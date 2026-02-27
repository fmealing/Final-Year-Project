from flask import Flask, jsonify, request
import sqlite3

DB_FILE = "telemetry.db"

app = Flask(__name__)

def query_db(query, args=(), one=False):
    con = sqlite3.connect(DB_FILE)
    con.row_factory = sqlite3.Row
    cur = con.cursor()
    cur.execute(query, args)
    rows = cur.fetchall()
    con.close()
    return (rows[0] if rows else None) if one else rows

@app.route("/health")
def health():
    return {"status": "ok"}

@app.route("/latest")
def latest():
    row = query_db(
        "SELECT * FROM telemetry ORDER BY id DESC LIMIT 1",
        one=True
    )

    if not row:
        return jsonify({"error": "no data"}), 404

    return jsonify(dict(row))

@app.route("/last_n")
def last_n():
    n = request.args.get("n", default=50, type=int)

    rows = query_db(
        "SELECT * FROM telemetry ORDER BY id DESC LIMIT ?",
        (n,)
    )

    return jsonify([dict(r) for r in rows])

if __name__ == "__main__":
    app.run(debug=True)