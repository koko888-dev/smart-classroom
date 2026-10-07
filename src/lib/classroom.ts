import { queryApi, bucket } from "@/src/lib/influxdb";
import { systems, type SchoolSample, type SystemKind } from "@/src/lib/school";
export type { ClassroomSample } from "@/src/lib/school";

export async function readSamples(
  after?: string, kind: SystemKind = "classroom", location = "ENG-301", history = false,
): Promise<SchoolSample[]> {
  const config = systems[kind];
  const rows = await queryApi.collectRows<Record<string, unknown>>(`
    from(bucket: ${JSON.stringify(bucket)})
      |> range(start: ${after ? `time(v: ${JSON.stringify(after)})` : "-1h"})
      ${after ? `|> filter(fn: (r) => r._time > time(v: ${JSON.stringify(after)}))` : ""}
      |> filter(fn: (r) => r._measurement == ${JSON.stringify(config.measurement)} and r[${JSON.stringify(config.tag)}] == ${JSON.stringify(location)})
      |> filter(fn: (r) => contains(value: r._field, set: ${JSON.stringify(config.fields)}))
      |> toFloat()
      |> group(columns: [${JSON.stringify(config.tag)}])
      |> pivot(rowKey: ["_time"], columnKey: ["_field"], valueColumn: "_value")
      |> filter(fn: (r) => ${config.fields.map((field) => `exists r.${field}`).join(" and ")})
      |> sort(columns: ["_time"])
      ${after || history ? "" : "|> tail(n: 1)"}
  `);
  return rows.map((row): SchoolSample => {
    const time = new Date(String(row._time)).toISOString();
    return kind === "classroom" ? {
      kind, time, room: location, temperature: Number(row.temperature),
      humidity: Number(row.humidity), co2: Number(row.co2), people: Number(row.people),
    } : {
      kind, time, building: location, power_w: Number(row.power_w), energy_kwh: Number(row.energy_kwh),
    };
  });
}

