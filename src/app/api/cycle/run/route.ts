import { runCycle } from "@/lib/simulation/runCycle";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  const result = await runCycle();
  return NextResponse.json(result);
}
