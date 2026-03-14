import { RunCycleInputSchema } from "@/lib/schemas";
import { runCycle } from "@/lib/simulation/runCycle";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const text = await request.text();
  const parsedInput = text.trim() ? RunCycleInputSchema.parse(JSON.parse(text)) : {};

  const result = await runCycle(parsedInput);
  return NextResponse.json(result);
}
