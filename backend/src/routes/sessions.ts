// ─── Session routes: POST /session, GET /sessions, GET /session/:id ──────────
import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { pool } from "../db";
import { publishSessionSummary } from "../mqtt";

export const sessionsRouter = Router();

// ─── POST /session ─────────────────────────────────────────────────────────────
sessionsRouter.post("/session", async (req: Request, res: Response) => {
  const { startedAt, endedAt, packets } = req.body;

  if (!startedAt || !endedAt || !Array.isArray(packets)) {
    return res
      .status(400)
      .json({ error: "startedAt, endedAt, and packets are required" });
  }

  if (packets.length === 0) {
    return res.status(400).json({ error: "packets array must not be empty" });
  }

  const id = uuidv4();
  const durationMs =
    new Date(endedAt).getTime() - new Date(startedAt).getTime();
  const repCount = packets[packets.length - 1]?.rep_count ?? 0;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(
      `INSERT INTO sessions (id, started_at, ended_at, duration_ms, rep_count)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, startedAt, endedAt, durationMs, repCount],
    );

    // Bulk-insert packets
    for (const p of packets) {
      await client.query(
        `INSERT INTO packets
           (session_id, accel_x, accel_y, accel_z, gyro_x, gyro_y, gyro_z,
            flex_1, flex_2, flex_3, flex_4, rep_count, timestamp)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [
          id,
          p.accel_x,
          p.accel_y,
          p.accel_z,
          p.gyro_x,
          p.gyro_y,
          p.gyro_z,
          p.flex_1,
          p.flex_2,
          p.flex_3,
          p.flex_4,
          p.rep_count,
          p.timestamp,
        ],
      );
    }

    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }

  // Publish summary to HiveMQ (best-effort, non-blocking)
  publishSessionSummary({ sessionId: id, repCount, durationMs, startedAt });

  return res.status(201).json({ id });
});

// ─── GET /sessions ─────────────────────────────────────────────────────────────
sessionsRouter.get("/sessions", async (_req: Request, res: Response) => {
  const result = await pool.query(
    `SELECT id, started_at AS "startedAt", ended_at AS "endedAt",
            duration_ms AS "durationMs", rep_count AS "repCount"
     FROM sessions
     ORDER BY started_at DESC`,
  );
  return res.json(result.rows);
});

// ─── GET /session/:id ──────────────────────────────────────────────────────────
sessionsRouter.get("/session/:id", async (req: Request, res: Response) => {
  const { id } = req.params;

  const sessionResult = await pool.query(
    `SELECT id, started_at AS "startedAt", ended_at AS "endedAt",
            duration_ms AS "durationMs", rep_count AS "repCount"
     FROM sessions WHERE id = $1`,
    [id],
  );

  if (sessionResult.rows.length === 0) {
    return res.status(404).json({ error: "Session not found" });
  }

  const packetsResult = await pool.query(
    `SELECT accel_x, accel_y, accel_z, gyro_x, gyro_y, gyro_z,
            flex_1, flex_2, flex_3, flex_4, rep_count, timestamp
     FROM packets WHERE session_id = $1 ORDER BY id ASC`,
    [id],
  );

  return res.json({
    ...sessionResult.rows[0],
    packets: packetsResult.rows,
  });
});
