import { NextResponse } from "next/server";

const FLASK_BASE = "http://127.0.0.1:5000";

export async function GET() {
  try {
    const res = await fetch(`${FLASK_BASE}/last_n?n=50`, { cache: "no-store" });
    if (!res.ok) {
      return NextResponse.json([], { status: res.status });
    }
    const data = await res.json();
    // Flask returns newest-first; reverse to oldest-first for charts
    return NextResponse.json((data as unknown[]).reverse());
  } catch {
    return NextResponse.json([], { status: 503 });
  }
}
