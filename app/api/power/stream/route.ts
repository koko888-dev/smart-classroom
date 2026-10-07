import { queryApi, bucket } from "@/src/lib/influxdb";
import { subscribe } from "@/src/lib/school-events";
import type { PowerSample } from "@/src/lib/school";

export function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const building = params.get("building") ?? "ENG";
  if (params.has("kind") || params.has("location") || params.has("room") ||
      !(["ENG","SCI"] as readonly string[]).includes(building)) {
    return Response.json({ error: "Invalid building" }, { status: 400 });
  }
  const encoder = new TextEncoder();
  let stopped = false;
  let unsubscribe = () => {};
  let detachAbort = () => {};
  const resume = request.headers.get("last-event-id");
  let lastTime = resume && !Number.isNaN(Date.parse(resume))
    ? new Date(resume).toISOString() : undefined;

  const stop = () => {
    stopped = true;
    unsubscribe();
    detachAbort();
  };

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const abort = () => {
        if (stopped) return;
        stop();
        controller.close();
      };
      request.signal.addEventListener("abort", abort, { once: true });
      detachAbort = () => request.signal.removeEventListener("abort", abort);
      if (request.signal.aborted) { abort(); return; }

      const send = (sample: PowerSample) => {
        if (stopped || (lastTime && sample.time <= lastTime)) return;
        controller.enqueue(encoder.encode(`id: ${sample.time}\ndata: ${JSON.stringify(sample)}\n\n`));
        lastTime = sample.time;
      };
      let ready = false;
      const pending: PowerSample[] = [];
      // Subscribe first so a write during the initial query cannot be missed.
      unsubscribe = subscribe((sample) => {
        if (sample.kind !== "power" || sample.building !== building) return;
        if (ready) send(sample);
        else pending.push(sample);
      });
      controller.enqueue(encoder.encode("retry: 2000\n\n"));

      const initialize = async () => {
        try {
          // One query on connection/reconnection; subsequent data arrives via events.
          const query = `
        from(bucket: ${JSON.stringify(bucket)})
          |> range(start: ${lastTime ? `time(v: ${JSON.stringify(lastTime)})` : "-1h"})
          ${lastTime ? `|> filter(fn: (r) => r._time > time(v: ${JSON.stringify(lastTime)}))` : ""}
          |> filter(fn: (r) => r._measurement == "school_power_usage" and r.building == ${JSON.stringify(building)})
          |> filter(fn: (r) => contains(value: r._field, set: ["power_w","energy_kwh"]))
          |> toFloat()
          |> group(columns: ["building"])
          |> pivot(rowKey: ["_time"], columnKey: ["_field"], valueColumn: "_value")
          |> filter(fn: (r) => exists r.power_w and exists r.energy_kwh)
          |> sort(columns: ["_time"])
          ${lastTime ? "" : "|> tail(n: 1)"}
          `;
          const rows = await queryApi.collectRows<Record<string, unknown>>(query);
          if (stopped) return;
          const samples = rows.map((row): PowerSample => ({
            kind: "power",
            time: new Date(String(row._time)).toISOString(),
            building,
            power_w: Number(row.power_w),
            energy_kwh: Number(row.energy_kwh),
          }));
          for (const sample of [...samples, ...pending].sort((a, b) => a.time.localeCompare(b.time))) send(sample);
          pending.length = 0;
          ready = true;
        } catch (error) {
          console.error("power stream failed:", error);
          if (!stopped) { stop(); controller.error(error); }
        }
      };
      void initialize();
    },
    cancel() { stop(); },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-store, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}

