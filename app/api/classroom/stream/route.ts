import { readSamples } from "@/src/lib/classroom";
import type { ClassroomSample } from "@/src/lib/classroom";
import { subscribe } from "@/src/lib/classroom-events";

export function GET(request: Request) {
  const encoder = new TextEncoder();
  let stopped = false;
  let unsubscribe = () => {};
  let detachAbort = () => {};
  const resume = request.headers.get("last-event-id");
  let lastTime = resume && !Number.isNaN(Date.parse(resume))
    ? new Date(resume).toISOString() : undefined;
  const stop = () => {
    stopped = true;
    unsubscribe();
    detachAbort();
  };
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const abort = () => {
        if (stopped) return;
        stop();
        controller.close();
      };
      request.signal.addEventListener("abort", abort, { once: true });
      detachAbort = () => request.signal.removeEventListener("abort", abort);
      if (request.signal.aborted) {
        abort();
        return;
      }
      const send = (sample: ClassroomSample) => {
        if (stopped || (lastTime && sample.time <= lastTime)) return;
        controller.enqueue(encoder.encode(`id: ${sample.time}\ndata: ${JSON.stringify(sample)}\n\n`));
        lastTime = sample.time;
      };
      let ready = false;
      const pending: ClassroomSample[] = [];
      // Subscribe before the initial query so writes during that query cannot be lost.
      unsubscribe = subscribe((sample) => {
        if (ready) send(sample);
        else pending.push(sample);
      });
      controller.enqueue(encoder.encode("retry: 2000\n\n"));
      const initialize = async () => {
        try {
          const samples = await readSamples(lastTime);
          if (stopped) return;
          for (const sample of [...samples, ...pending].sort((a, b) => a.time.localeCompare(b.time))) send(sample);
          pending.length = 0;
          ready = true;
        } catch (error) {
          console.error("Classroom stream failed:", error);
          if (!stopped) {
            stop();
            controller.error(error);
          }
        }
      };
      void initialize();
    },
    cancel() {
      stop();
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-store, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
