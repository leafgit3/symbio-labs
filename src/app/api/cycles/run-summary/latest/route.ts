import { readStore } from "@/lib/db/store";
import { RunSummarySchema } from "@/lib/schemas";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const store = readStore();

  const event = [...store.eventLogs]
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .find((item) => item.event_type === "cycle_finished" && item.payload && typeof item.payload === "object");

  const maybeSummary =
    event && typeof event.payload === "object" && "runSummary" in event.payload
      ? (event.payload as { runSummary?: unknown }).runSummary
      : null;

  const parsed = RunSummarySchema.safeParse(maybeSummary);
  return NextResponse.json(parsed.success ? parsed.data : null);
}
