// A classroom scenario for demos, not a calibrated physical sensor model.
function createSimulator(random = Math.random, initial = {}) {
  let state = { temperature: 29, humidity: 68, co2: 900, people: 20, ...initial };
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const noise = (size) => (random() * 2 - 1) * size;

  return () => {
    let people = state.people;
    // Occasionally 1–3 people enter or leave; otherwise occupancy stays the same.
    if (random() < 0.25) {
      const change = 1 + Math.floor(random() * 3);
      people = clamp(people + (random() < 0.5 ? -change : change), 0, 50);
    }
    const targetTemperature = 28 + people * 0.06;
    const targetHumidity = 62 + people * 0.2;
    const targetCo2 = 700 + people * 12;
    state = {
      temperature: Number(clamp(state.temperature +
        clamp((targetTemperature - state.temperature) * 0.05 + noise(0.06), -0.1, 0.1), 27, 32).toFixed(1)),
      humidity: Math.round(clamp(state.humidity +
        clamp((targetHumidity - state.humidity) * 0.1 + noise(0.6), -1, 1), 60, 80)),
      co2: Math.round(clamp(state.co2 +
        clamp((targetCo2 - state.co2) * 0.08 + noise(5), -20, 20), 700, 1300)),
      people,
    };
    return { ...state };
  };
}

module.exports = { createSimulator };
