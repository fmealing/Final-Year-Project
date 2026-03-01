import { NextResponse } from "next/server";
import axios from "axios";

const FLASK_BASE = process.env.FLASK_API_URL ?? "http://127.0.0.1:5000";

export async function GET() {
  try {
    const { data } = await axios.get(`${FLASK_BASE}/latest`);
    return NextResponse.json(data);
  } catch (err) {
    if (axios.isAxiosError(err) && err.response) {
      return NextResponse.json(err.response.data, { status: err.response.status });
    }
    return NextResponse.json({ error: "Flask API unreachable" }, { status: 503 });
  }
}
