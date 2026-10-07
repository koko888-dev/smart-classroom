import type { SchoolSample } from "@/src/lib/school";

type Listener = (sample: SchoolSample) => void;
// Keep subscribers across module reloads in this single local Next.js server.
const shared = globalThis as typeof globalThis & {
  classroomListeners?: Set<Listener>;
};
const listeners = (shared.classroomListeners ??= new Set<Listener>());

export function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function publish(sample: SchoolSample) {
  for (const listener of listeners) listener(sample);
}
