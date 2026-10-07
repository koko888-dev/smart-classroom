const { Point } = require("@influxdata/influxdb-client");
const { createPowerSimulator } = require("./power-simulator");
const { createWriter, runGenerator } = require("./generator-runtime");
const writer = createWriter();
let buildings;
async function initialize() {
  buildings = await Promise.all([
    { building: "ENG", baseW: 5200 }, { building: "SCI", baseW: 3800 },
  ].map(async ({ building, baseW }) => {
    const energyKwh = await writer.latestField("school_power_usage", "building", building, "energy_kwh") ?? 0;
    return { building, next: createPowerSimulator({ baseW, energyKwh }) };
  }));
}
async function saveData() {
  if (!buildings) await initialize();
  const time = new Date();
  const samples = buildings.map(({ building, next }) => ({ kind: "power", building, time: time.toISOString(), ...next(time.getTime()) }));
  const points = samples.map((sample) => new Point("school_power_usage")
    .tag("building", sample.building).timestamp(time)
    .floatField("power_w", sample.power_w).floatField("energy_kwh", sample.energy_kwh));
  await writer.save(points, samples);
}
function run() {
  return runGenerator({ name: "Power generator", port: 43102, initialize, save: saveData, close: () => writer.writeApi.close() });
}
if (require.main === module) void run();
module.exports = { saveData, run, writeApi: writer.writeApi };
