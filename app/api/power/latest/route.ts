import { queryApi, bucket } from "@/src/lib/influxdb";
import type { PowerSample } from "@/src/lib/school";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const building = params.get("building") ?? "ENG";
  if (params.has("kind") || params.has("location") || params.has("room") ||
      !(["ENG","SCI"] as readonly string[]).includes(building)) {
    return Response.json({ error: "Invalid building" }, { status: 400 });
  }
  try {
    const query = `
        from(bucket: ${JSON.stringify(bucket)})
          |> range(start: -1h)
          
          |> filter(fn: (r) => r._measurement == "school_power_usage" and r.building == ${JSON.stringify(building)})
          |> filter(fn: (r) => contains(value: r._field, set: ["power_w","energy_kwh"]))
          |> toFloat()
          |> group(columns: ["building"])
          |> pivot(rowKey: ["_time"], columnKey: ["_field"], valueColumn: "_value")
          |> filter(fn: (r) => exists r.power_w and exists r.energy_kwh)
          |> sort(columns: ["_time"])
          |> tail(n: 1)
    `;
    const rows = await queryApi.collectRows<Record<string, unknown>>(query);
    const samples = rows.map((row): PowerSample => ({
        kind: "power",
        time: new Date(String(row._time)).toISOString(),
        building,
        power_w: Number(row.power_w),
        energy_kwh: Number(row.energy_kwh),
      }));
    return Response.json(samples[0] ?? null, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("power latest failed:", error);
    return Response.json({ error: "Cannot read power latest" }, { status: 500 });
  }
}

