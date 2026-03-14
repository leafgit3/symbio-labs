import { getLatestCycleRun } from "@/lib/db/runtimeQueries";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const cycleRun = await getLatestCycleRun();
  return NextResponse.json(cycleRun);
}
