import { readSamples } from "@/src/lib/classroom";

export function GET(request: Request) {
  const encoder = new TextEncoder();
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const resume = request.headers.get("last-event-id");
  let lastTime = resume && !Number.isNaN(Date.parse(resume)) ? resume : undefined;
  const stop = () => {
    stopped = true;
    clearTimeout(timer);
  };
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const abort = () => {
        if (stopped) return;
        stop();
        controller.close();
      };
      request.signal.addEventListener("abort", abort, { once: true });
      if (request.signal.aborted) {
        abort();
        return;
      }
      const poll = async () => {
        try {
          const samples = await readSamples(lastTime);
          if (stopped) return;
          for (const sample of samples) {
            controller.enqueue(encoder.encode(`id: ${sample.time}\ndata: ${JSON.stringify(sample)}\n\n`));
            lastTime = sample.time;
          }
          controller.enqueue(encoder.encode(": keep-alive\n\n"));
          timer = setTimeout(poll, 1000);
        } catch (error) {
          console.error("Classroom stream failed:", error);
          request.signal.removeEventListener("abort", abort);
          if (!stopped) {
            stop();
            controller.error(error);
          }
        }
      };
      void poll();
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
