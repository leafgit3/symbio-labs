import { readStore } from "@/lib/db/store";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const store = readStore();
  const cycleRun = store.cycleRuns[store.cycleRuns.length - 1];
  return NextResponse.json(cycleRun);
}
