import { readSamples } from "@/src/lib/classroom";
import { selectionFromUrl } from "@/src/lib/school";

export async function GET(request: Request) {
  const selection = selectionFromUrl(request.url);
  if (!selection) return Response.json({ error: "Invalid selection" }, { status: 400 });
  try {
    const samples = await readSamples(undefined, selection.kind, selection.location, true);
    return Response.json(samples, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Cannot read history" }, { status: 500 });
  }
}

