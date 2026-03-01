import { NextResponse } from "next/server";
import axios from "axios";

const FLASK_BASE = process.env.FLASK_API_URL ?? "http://127.0.0.1:5000";

export async function GET() {
  try {
    const { data } = await axios.get<unknown[]>(`${FLASK_BASE}/last_n?n=50`);
    // Flask returns newest-first; reverse to oldest-first for charts
    return NextResponse.json(data.reverse());
  } catch (err) {
    if (axios.isAxiosError(err) && err.response) {
      return NextResponse.json([], { status: err.response.status });
    }
    return NextResponse.json([], { status: 503 });
  }
}
