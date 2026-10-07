const { Point } = require("@influxdata/influxdb-client");
const { createSimulator } = require("./classroom-simulator");
const { createWriter, runGenerator } = require("./generator-runtime");
const writer = createWriter("classroom");
const rooms = [
  { room: "ENG-301", next: createSimulator() },
  { room: "ENG-302", next: createSimulator(Math.random, { temperature: 28.2, humidity: 65, co2: 820, people: 12 }) },
];
async function saveData() {
  const time = new Date();
  const samples = rooms.map(({ room, next }) => ({ kind: "classroom", room, time: time.toISOString(), ...next() }));
  const points = samples.map((sample) => new Point("classroom_environment")
    .tag("room", sample.room).timestamp(time)
    .floatField("temperature", sample.temperature).intField("humidity", sample.humidity)
    .intField("co2", sample.co2).intField("people", sample.people));
  await writer.save(points, samples);
}
function run() {
  return runGenerator({ name: "Classroom generator", port: 43101, save: saveData, close: () => writer.writeApi.close() });
}
if (require.main === module) void run();
module.exports = { saveData, run, writeApi: writer.writeApi };
