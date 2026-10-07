import { timingSafeEqual } from "node:crypto";
import { publish } from "@/src/lib/classroom-events";
import { systems, type SchoolSample } from "@/src/lib/school";

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
  // Older single-room generators omit kind.
  const kind = data.kind ?? "classroom";
  if (kind !== "classroom" && kind !== "power") {
    return Response.json({ error: "Invalid system" }, { status: 400 });
  }
  const config = systems[kind];
  if (typeof data.time !== "string" || Number.isNaN(Date.parse(data.time)) ||
      !(config.locations as readonly unknown[]).includes(data[config.tag]) ||
      !config.fields.every((field) => typeof data[field] === "number" && Number.isFinite(data[field])) ||
      (kind === "classroom" && (!Number.isInteger(data.people) || Number(data.people) < 0 || Number(data.people) > 50)) ||
      (kind === "power" && (Number(data.power_w) < 0 || Number(data.energy_kwh) < 0))) {
    return Response.json({ error: "Invalid sample" }, { status: 400 });
  }
  const time = new Date(data.time).toISOString();
  const sample: SchoolSample = kind === "classroom" ? {
    kind, time, room: String(data.room), temperature: Number(data.temperature),
    humidity: Number(data.humidity), co2: Number(data.co2), people: Number(data.people),
  } : {
    kind, time, building: String(data.building), power_w: Number(data.power_w), energy_kwh: Number(data.energy_kwh),
  };
  publish(sample);
  return Response.json({ ok: true });
}

