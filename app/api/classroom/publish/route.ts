import { timingSafeEqual } from "node:crypto";
import { publish } from "@/src/lib/classroom-events";
import type { ClassroomSample } from "@/src/lib/classroom";

export async function POST(request: Request) {
  const token = process.env.INFLUX_TOKEN;
  if (!token) return Response.json({ error: "Publisher not configured" }, { status: 503 });
  const expected = Buffer.from(`Bearer ${token}`);
  const provided = Buffer.from(request.headers.get("authorization") ?? "");
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  let sample: ClassroomSample;
  try {
    sample = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!sample || sample.room !== "ENG-301" || typeof sample.time !== "string" ||
      Number.isNaN(Date.parse(sample.time)) ||
      ![sample.temperature, sample.humidity, sample.co2, sample.people].every(Number.isFinite) ||
      !Number.isInteger(sample.people) || sample.people < 0 || sample.people > 50) {
    return Response.json({ error: "Invalid sample" }, { status: 400 });
  }
  publish({ ...sample, time: new Date(sample.time).toISOString() });
  return Response.json({ ok: true });
}
