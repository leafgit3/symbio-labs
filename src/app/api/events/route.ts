import { readStore } from "@/lib/db/store";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const store = readStore();
  const events = [...store.eventLogs]
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .slice(0, 120);
  return NextResponse.json(events);
}
