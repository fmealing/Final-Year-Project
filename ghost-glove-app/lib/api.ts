// ─── Backend API Client ───────────────────────────────────────────────────────────
// Communicates with the Ghost Glove backend (Railway/Render free-hosted).
// F8: POST /session, GET /sessions, GET /session/:id

import type {
  PostSessionPayload,
  PostSessionResponse,
  Session,
  SessionSummary,
} from "./types";

// Set EXPO_PUBLIC_API_URL in your .env (e.g. https://ghost-glove-api.railway.app)
const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";
const API_KEY  = process.env.EXPO_PUBLIC_API_KEY ?? "";

const headers = (): Record<string, string> => ({
  "Content-Type": "application/json",
  ...(API_KEY ? { "x-api-key": API_KEY } : {}),
});

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// POST /session — upload a completed session
export async function postSession(
  payload: PostSessionPayload
): Promise<PostSessionResponse> {
  const res = await fetch(`${BASE_URL}/session`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(payload),
  });
  return handleResponse<PostSessionResponse>(res);
}

// GET /sessions — list all sessions (summaries, no packet data)
export async function getSessions(): Promise<SessionSummary[]> {
  const res = await fetch(`${BASE_URL}/sessions`, { headers: headers() });
  return handleResponse<SessionSummary[]>(res);
}

// GET /session/:id — single session with full packet data
export async function getSession(id: string): Promise<Session> {
  const res = await fetch(`${BASE_URL}/session/${id}`, { headers: headers() });
  return handleResponse<Session>(res);
}
