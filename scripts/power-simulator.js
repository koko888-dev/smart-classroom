// Gradual building load with energy integrated from watts and elapsed seconds.
function createPowerSimulator({ baseW, energyKwh = 0, random = Math.random, startTime = Date.now() }) {
  let powerW = baseW;
  let energy = energyKwh;
  let previousTime = startTime;
  return (time = Date.now()) => {
    const seconds = Math.max(0, (time - previousTime) / 1000);
    const nextPower = Math.max(0, Math.round(powerW + (baseW - powerW) * 0.08 + (random() * 2 - 1) * 100));
    energy += ((powerW + nextPower) / 2) * seconds / 3600000;
    previousTime = time;
    powerW = nextPower;
    return { power_w: powerW, energy_kwh: Number(energy.toFixed(8)) };
  };
}
module.exports = { createPowerSimulator };
