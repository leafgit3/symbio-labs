import { getLatestRunSummary } from "@/lib/db/runtimeQueries";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const runSummary = await getLatestRunSummary();
  return NextResponse.json(runSummary);
}
