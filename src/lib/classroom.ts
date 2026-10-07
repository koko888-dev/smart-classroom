import { queryApi, bucket } from "@/src/lib/influxdb";

export type ClassroomSample = {
  time: string;
  room: string;
  temperature: number;
  humidity: number;
  co2: number;
  people: number;
};

export async function readSamples(after?: string): Promise<ClassroomSample[]> {
  const selection = after
    ? ""
    : `|> tail(n: 1)`;
  const rows = await queryApi.collectRows<ClassroomSample & { _time: string }>(`
    from(bucket: ${JSON.stringify(bucket)})
      |> range(start: ${after ? `time(v: ${JSON.stringify(after)})` : "-1h"})
      ${after ? `|> filter(fn: (r) => r._time > time(v: ${JSON.stringify(after)}))` : ""}
      |> filter(fn: (r) => r._measurement == "classroom_environment" and r.room == "ENG-301")
      |> filter(fn: (r) => contains(value: r._field, set: ["temperature", "humidity", "co2", "people"]))
      |> toFloat()
      |> group(columns: ["room"])
      |> pivot(rowKey: ["_time"], columnKey: ["_field"], valueColumn: "_value")
      |> filter(fn: (r) => exists r.temperature and exists r.humidity and exists r.co2 and exists r.people)
      |> sort(columns: ["_time"])
      ${selection}
  `);
  return rows.map((row) => ({
    time: new Date(row._time).toISOString(),
    room: row.room,
    temperature: Number(row.temperature),
    humidity: Number(row.humidity),
    co2: Number(row.co2),
    people: Number(row.people),
  }));
}
