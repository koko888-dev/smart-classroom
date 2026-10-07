const test = require("node:test");
const assert = require("node:assert/strict");
const { createPowerSimulator } = require("../scripts/power-simulator");
const { createSimulator } = require("../scripts/classroom-simulator");

test("constant 3600 watts adds exactly 1 kWh over 1000 seconds", () => {
  const next = createPowerSimulator({ baseW: 3600, energyKwh: 12, random: () => 0.5, startTime: 0 });
  assert.equal(next(0).energy_kwh, 12);
  assert.equal(next(1000000).energy_kwh, 13);
});

test("variable load uses elapsed time and trapezoidal integration", () => {
  const next = createPowerSimulator({ baseW: 5000, random: () => 1, startTime: 0 });
  const sample = next(5000);
  assert.equal(sample.power_w, 5100);
  assert.ok(Math.abs(sample.energy_kwh - (5050 * 5 / 3600000)) < 0.00000001);
  let previous = sample;
  for (let i = 2; i < 2000; i++) {
    const current = next(i * 5000);
    assert.ok(current.energy_kwh >= previous.energy_kwh);
    assert.ok(Math.abs(current.power_w - previous.power_w) <= 100);
    previous = current;
  }
});

test("rooms and buildings retain independent simulation state", () => {
  const first = createSimulator(() => 0.9, { people: 20 });
  const second = createSimulator(() => 0.9, { people: 12 });
  first(); first();
  assert.equal(second().people, 12);
  const eng = createPowerSimulator({ baseW: 5200, energyKwh: 30, random: () => 0.5, startTime: 0 });
  const sci = createPowerSimulator({ baseW: 3800, energyKwh: 10, random: () => 0.5, startTime: 0 });
  eng(5000);
  assert.equal(sci(0).energy_kwh, 10);
});
