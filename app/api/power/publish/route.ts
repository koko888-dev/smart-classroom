import { timingSafeEqual } from "node:crypto";
import { publish } from "@/src/lib/school-events";
import type { PowerSample } from "@/src/lib/school";

export async function POST(request: Request) {
  const token = process.env.INFLUX_TOKEN;
  if (!token) return Response.json({ error: "Publisher not configured" }, { status: 503 });
  const expected = Buffer.from(`Bearer ${token}`);
  const provided = Buffer.from(request.headers.get("authorization") ?? "");
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let data: Record<string, unknown>;
  try {
    data = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return Response.json({ error: "Invalid sample" }, { status: 400 });
  }
  if (data.kind !== "power") {
    return Response.json({ error: "Invalid system" }, { status: 400 });
  }
  if (typeof data.time !== "string" || Number.isNaN(Date.parse(data.time)) ||
      !(["ENG","SCI"] as readonly unknown[]).includes(data.building) ||
      ![data.power_w, data.energy_kwh].every(value => typeof value === "number" && Number.isFinite(value)) ||
      Number(data.power_w) < 0 || Number(data.energy_kwh) < 0) {
    return Response.json({ error: "Invalid power sample" }, { status: 400 });
  }

  const sample: PowerSample = {
    kind: "power",
    time: new Date(data.time).toISOString(),
    building: String(data.building),
    power_w: Number(data.power_w),
    energy_kwh: Number(data.energy_kwh),
  };
  publish(sample);
  return Response.json({ ok: true });
}

