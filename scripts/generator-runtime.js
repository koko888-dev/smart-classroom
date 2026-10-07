const path = require("path");
const net = require("net");
require("dotenv").config({ path: path.resolve(__dirname, "../.env.local"), quiet: true });
const { InfluxDB } = require("@influxdata/influxdb-client");

function createWriter(kind) {
  if (kind !== "classroom" && kind !== "power") throw new Error("Invalid generator kind");
  const token = process.env.INFLUX_TOKEN;
  const db = new InfluxDB({ url: process.env.INFLUX_URL, token });
  const writeApi = db.getWriteApi(process.env.INFLUX_ORG, process.env.INFLUX_BUCKET, "ns", { flushInterval: 0 });
  const queryApi = db.getQueryApi(process.env.INFLUX_ORG);
  const publishUrl = new URL(`/api/${kind}/publish`, process.env.CLASSROOM_APP_URL || "http://localhost:3000");
  const pending = [];
  return {
    writeApi,
    async latestField(measurement, tag, location, field) {
      const rows = await queryApi.collectRows(`
        from(bucket: ${JSON.stringify(process.env.INFLUX_BUCKET)})
          |> range(start: -30d)
          |> filter(fn: (r) => r._measurement == ${JSON.stringify(measurement)} and r[${JSON.stringify(tag)}] == ${JSON.stringify(location)} and r._field == ${JSON.stringify(field)})
          |> last()
      `);
      return rows.length ? Number(rows[rows.length - 1]._value) : undefined;
    },
    async save(points, samples) {
      writeApi.writePoints(points);
      await writeApi.flush();
      pending.push(...samples);
      if (pending.length > 1440) pending.splice(0, pending.length - 1440);
      try {
        while (pending.length) {
          const response = await fetch(publishUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify(pending[0]), signal: AbortSignal.timeout(4000),
          });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          pending.shift();
        }
      } catch (error) {
        console.error("บันทึกแล้ว แต่ส่งเข้าเว็บไม่สำเร็จ จะลองใหม่รอบถัดไป:", error.message);
      }
      for (const sample of samples) console.log("บันทึกแล้ว:", JSON.stringify(sample));
    },
  };
}

async function runGenerator({ name, port, initialize, save, close }) {
  // A local exclusive port prevents a second copy of the same generator.
  const lock = net.createServer((socket) => socket.end());
  try {
    await new Promise((resolve, reject) => {
      lock.once("error", reject);
      lock.listen(port, "127.0.0.1", resolve);
    });
  } catch (error) {
    console.error(error.code === "EADDRINUSE" ? `${name} กำลังทำงานอยู่แล้ว ไม่เปิดซ้ำ` : error);
    await close();
    process.exitCode = 1;
    return;
  }
  let stopped = false;
  let timer;
  let current;
  const stop = async () => {
    if (stopped) return;
    stopped = true;
    clearTimeout(timer);
    lock.close();
    await current?.catch(() => {});
    await close();
  };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  try {
    await initialize?.();
    const tick = async () => {
      if (stopped) return;
      const started = Date.now();
      current = save();
      try { await current; } catch (error) { console.error("เขียนข้อมูลไม่สำเร็จ:", error.message); }
      if (!stopped) timer = setTimeout(tick, Math.max(0, 5000 - (Date.now() - started)));
    };
    console.log(`${name}: ทุก 5 วินาที`);
    await tick();
  } catch (error) {
    console.error(error);
    await stop();
    process.exitCode = 1;
  }
}
module.exports = { createWriter, runGenerator };
