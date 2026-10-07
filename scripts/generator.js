const path = require("path");

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

function generateData() {
  const temperature = Number(
    (27 + Math.random() * 5).toFixed(1)
  );

  const humidity = Math.floor(
    60 + Math.random() * 21
  );

  const co2 = Math.floor(
    700 + Math.random() * 601
  );

  const people = Math.floor(
    Math.random() * 51
  );

  return {
    temperature,
    humidity,
    co2,
    people,
  };
}

async function saveData() {
  try {
    const data = generateData();

    const point = new Point(
      "classroom_environment"
    )
      .tag("room", "ENG-301")
      .timestamp(new Date())
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
  await saveData();
  setTimeout(run, 5000);
}

run();
