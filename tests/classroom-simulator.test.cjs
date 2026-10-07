const test = require("node:test");
const assert = require("node:assert/strict");
const { createSimulator } = require("../scripts/classroom-simulator");

test("a long classroom session stays within bounds without sudden jumps", () => {
  let seed = 42;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const next = createSimulator(random);
  let previous = { temperature: 29, humidity: 68, co2: 900, people: 20 };
  let unchangedOccupancy = 0;
  let occupancyEvents = 0;
  for (let i = 0; i < 10000; i++) {
    const sample = next();
    assert.ok(sample.temperature >= 27 && sample.temperature <= 32);
    assert.ok(sample.humidity >= 60 && sample.humidity <= 80);
    assert.ok(sample.co2 >= 700 && sample.co2 <= 1300);
    assert.ok(Number.isInteger(sample.people) && sample.people >= 0 && sample.people <= 50);
    assert.ok(Math.abs(sample.temperature - previous.temperature) <= 0.100001);
    assert.ok(Math.abs(sample.humidity - previous.humidity) <= 1);
    assert.ok(Math.abs(sample.co2 - previous.co2) <= 20);
    assert.ok(Math.abs(sample.people - previous.people) <= 3);
    if (sample.people === previous.people) unchangedOccupancy++;
    else occupancyEvents++;
    previous = sample;
  }
  assert.ok(unchangedOccupancy > occupancyEvents);
  assert.ok(occupancyEvents > 0);
});

test("occupancy stays fixed without entry or exit events", () => {
  const next = createSimulator(() => 0.9);
  for (let i = 0; i < 100; i++) assert.equal(next().people, 20);
});
