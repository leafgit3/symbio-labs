import { getEventLogs } from "@/lib/db/runtimeQueries";
import { EventTypeSchema } from "@/lib/schemas";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export async function GET(request: Request) {
  const url = new URL(request.url);

  const limitRaw = Number(url.searchParams.get("limit") ?? 200);
  const cycleNumberRaw = url.searchParams.get("cycleNumber");
  const eventTypeRaw = url.searchParams.get("eventType");

  const limit = Number.isFinite(limitRaw) ? clamp(Math.trunc(limitRaw), 1, 500) : 200;
  const cycleNumber =
    cycleNumberRaw !== null && cycleNumberRaw.trim() !== "" ? Number.parseInt(cycleNumberRaw, 10) : undefined;
  const parsedEventType = eventTypeRaw ? EventTypeSchema.safeParse(eventTypeRaw) : null;

  const events = await getEventLogs({
    limit,
    cycleNumber: Number.isInteger(cycleNumber) ? cycleNumber : undefined,
    eventType: parsedEventType?.success ? parsedEventType.data : undefined,
  });
  return NextResponse.json(events);
}
