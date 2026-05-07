// ─── NeonSQL (Postgres) connection ────────────────────────────────────────────
import { Pool } from "pg";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // required for NeonSQL
  max: 5,
});

// ─── Schema initialisation ────────────────────────────────────────────────────
// Run once on startup. Safe to re-run — uses CREATE TABLE IF NOT EXISTS.
export async function initDb(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      id          TEXT PRIMARY KEY,
      started_at  TIMESTAMPTZ NOT NULL,
      ended_at    TIMESTAMPTZ NOT NULL,
      duration_ms INTEGER     NOT NULL,
      rep_count   INTEGER     NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS packets (
      id          SERIAL  PRIMARY KEY,
      session_id  TEXT    NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      accel_x     REAL    NOT NULL,
      accel_y     REAL    NOT NULL,
      accel_z     REAL    NOT NULL,
      gyro_x      REAL    NOT NULL,
      gyro_y      REAL    NOT NULL,
      gyro_z      REAL    NOT NULL,
      flex_1      REAL    NOT NULL,
      flex_2      REAL    NOT NULL,
      flex_3      REAL    NOT NULL,
      flex_4      REAL    NOT NULL,
      rep_count   INTEGER NOT NULL,
      timestamp   INTEGER NOT NULL
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_packets_session_id ON packets(session_id);
  `);
}
