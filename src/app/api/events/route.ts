import { getEventLogs } from "@/lib/db/runtimeQueries";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const events = await getEventLogs(200);
  return NextResponse.json(events);
}
