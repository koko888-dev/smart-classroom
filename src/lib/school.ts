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

export function selectionFromUrl(url: string): { kind: SystemKind; location: string } | null {
  const params = new URL(url).searchParams;
  const kind = params.get("kind") ?? "classroom";
  if (kind !== "classroom" && kind !== "power") return null;
  const location = params.get("location") ?? systems[kind].locations[0];
  if (!(systems[kind].locations as readonly string[]).includes(location)) return null;
  return { kind, location };
}
