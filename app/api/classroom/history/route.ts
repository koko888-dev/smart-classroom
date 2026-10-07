import { NextResponse } from "next/server";
import { queryApi, bucket } from "@/src/lib/influxdb";

type HistoryData = {
  time: string;
  temperature?: number;
  humidity?: number;
  co2?: number;
  people?: number;
};

export async function GET() {
  try {
    const query = `
      from(bucket: "${bucket}")
        |> range(start: -1h)
        |> filter(fn: (r) => r._measurement == "classroom_environment")
        |> filter(fn: (r) => r.room == "ENG-301")
        |> sort(columns: ["_time"])
    `;

    const dataMap = new Map<string, HistoryData>();

    await new Promise<void>((resolve, reject) => {
      queryApi.queryRows(query, {
        next(row, tableMeta) {
          const data = tableMeta.toObject(row);

          const time = new Date(data._time).toISOString();

          if (!dataMap.has(time)) {
            dataMap.set(time, {
              time,
            });
          }

          const item = dataMap.get(time)!;

          if (data._field === "temperature") {
            item.temperature = Number(data._value);
          }

          if (data._field === "humidity") {
            item.humidity = Number(data._value);
          }

          if (data._field === "co2") {
            item.co2 = Number(data._value);
          }

          if (data._field === "people") {
            item.people = Number(data._value);
          }
        },

        error(error) {
          reject(error);
        },

        complete() {
          resolve();
        },
      });
    });

    return NextResponse.json(
      Array.from(dataMap.values()).sort((a, b) => a.time.localeCompare(b.time)),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "ไม่สามารถอ่าน history ได้" },
      { status: 500 }
    );
  }
}
