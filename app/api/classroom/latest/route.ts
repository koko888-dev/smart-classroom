import { NextResponse } from "next/server";
import { readSamples } from "@/src/lib/classroom";


export async function GET() {
  try {
    const samples = await readSamples();
    const result = samples[0] ?? null;

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Cannot read data from InfluxDB" },
      { status: 500 }
    );
  }
}
