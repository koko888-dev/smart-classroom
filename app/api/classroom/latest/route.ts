import { queryApi, bucket } from "@/src/lib/influxdb";
import type { ClassroomSample } from "@/src/lib/school";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const room = params.get("room") ?? "ENG-301";
  if (params.has("kind") || params.has("location") || params.has("building") ||
      !(["ENG-301","ENG-302"] as readonly string[]).includes(room)) {
    return Response.json({ error: "Invalid room" }, { status: 400 });
  }
  try {
    const query = `
        from(bucket: ${JSON.stringify(bucket)})
          |> range(start: -1h)
          
          |> filter(fn: (r) => r._measurement == "classroom_environment" and r.room == ${JSON.stringify(room)})
          |> filter(fn: (r) => contains(value: r._field, set: ["temperature","humidity","co2","people"]))
          |> toFloat()
          |> group(columns: ["room"])
          |> pivot(rowKey: ["_time"], columnKey: ["_field"], valueColumn: "_value")
          |> filter(fn: (r) => exists r.temperature and exists r.humidity and exists r.co2 and exists r.people)
          |> sort(columns: ["_time"])
          |> tail(n: 1)
    `;
    const rows = await queryApi.collectRows<Record<string, unknown>>(query);
    const samples = rows.map((row): ClassroomSample => ({
        kind: "classroom",
        time: new Date(String(row._time)).toISOString(),
        room,
        temperature: Number(row.temperature),
        humidity: Number(row.humidity),
        co2: Number(row.co2),
        people: Number(row.people),
      }));
    return Response.json(samples[0] ?? null, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("classroom latest failed:", error);
    return Response.json({ error: "Cannot read classroom latest" }, { status: 500 });
  }
}

