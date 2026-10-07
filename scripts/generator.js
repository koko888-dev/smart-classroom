const path = require("path");
const { createSimulator } = require("./simulator");

require("dotenv").config({
  path: path.resolve(__dirname, "../.env.local"),
});

const {
  InfluxDB,
  Point,
} = require("@influxdata/influxdb-client");

const url = process.env.INFLUX_URL;
const token = process.env.INFLUX_TOKEN;
const org = process.env.INFLUX_ORG;
const bucket = process.env.INFLUX_BUCKET;

const influxDB = new InfluxDB({
  url,
  token,
});

const writeApi = influxDB.getWriteApi(
  org,
  bucket,
  "ns",
  { flushInterval: 0 }
);

const generateData = createSimulator();
const publishUrl = new URL("/api/classroom/publish", process.env.CLASSROOM_APP_URL || "http://localhost:3000");
const pending = [];

async function publishPending() {
  while (pending.length) {
    const response = await fetch(publishUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(pending[0]),
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) throw new Error(`Publish failed: HTTP ${response.status}`);
    pending.shift();
  }
}

async function saveData() {
  try {
    const data = generateData();
    const time = new Date();

    const point = new Point(
      "classroom_environment"
    )
      .tag("room", "ENG-301")
      .timestamp(time)
      .floatField(
        "temperature",
        data.temperature
      )
      .intField(
        "humidity",
        data.humidity
      )
      .intField(
        "co2",
        data.co2
      )
      .intField(
        "people",
        data.people
      );

    writeApi.writePoint(point);

    // บังคับส่งข้อมูลที่ buffer อยู่ไป InfluxDB
    await writeApi.flush();

    // Publish only after the database confirms the write. Retry on the next sample.
    pending.push({ ...data, room: "ENG-301", time: time.toISOString() });
    if (pending.length > 720) pending.shift();
    try {
      await publishPending();
    } catch (error) {
      console.error("บันทึกแล้ว แต่ส่งเข้าเว็บไม่สำเร็จ จะลองใหม่รอบถัดไป:", error.message);
    }

    console.log("บันทึกลง InfluxDB แล้ว:");
    console.log(
      `Temperature: ${data.temperature} °C`
    );
    console.log(
      `Humidity: ${data.humidity} %`
    );
    console.log(
      `CO₂: ${data.co2} ppm`
    );
    console.log(
      `People: ${data.people}`
    );
    console.log("--------------------------");

  } catch (error) {
    console.error(
      "เขียนข้อมูลไม่สำเร็จ:",
      error
    );
  }
}

// Wait for each write before scheduling another one, so slow writes cannot overlap.
async function run() {
  const started = Date.now();
  await saveData();
  setTimeout(run, Math.max(0, 5000 - (Date.now() - started)));
}

if (require.main === module) run();

module.exports = { saveData, writeApi };
