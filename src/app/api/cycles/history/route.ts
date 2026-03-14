import { getCycleHistory } from "@/lib/db/runtimeQueries";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const history = await getCycleHistory(120);
  return NextResponse.json(history);
}
