export const systems = {
  classroom: {
    title: "สภาพห้องเรียน", measurement: "classroom_environment", tag: "room",
    locations: ["ENG-301", "ENG-302"], fields: ["temperature", "humidity", "co2", "people"],
  },
  power: {
    title: "การใช้ไฟฟ้า", measurement: "school_power_usage", tag: "building",
    locations: ["ENG", "SCI"], fields: ["power_w", "energy_kwh"],
  },
} as const;
export type SystemKind = keyof typeof systems;
export type ClassroomSample = {
  kind: "classroom"; time: string; room: string;
  temperature: number; humidity: number; co2: number; people: number;
};
export type PowerSample = {
  kind: "power"; time: string; building: string; power_w: number; energy_kwh: number;
};
export type SchoolSample = ClassroomSample | PowerSample;

export function sampleLocation(sample: SchoolSample) {
  return sample.kind === "classroom" ? sample.room : sample.building;
}

