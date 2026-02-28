import { NextResponse } from "next/server";

const FLASK_BASE = "http://127.0.0.1:5000";

export async function GET() {
  try {
    const res = await fetch(`${FLASK_BASE}/latest`, { cache: "no-store" });
    if (!res.ok) {
      return NextResponse.json({ error: "no data" }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Flask API unreachable" }, { status: 503 });
  }
}
