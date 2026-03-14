import { EventLog, EventLogSchema } from "@/lib/schemas";

export function buildEvent(args: {
  cycleNumber: number;
  eventType: EventLog["event_type"];
  summary: string;
  sourceAgentId?: string;
  payload?: Record<string, unknown>;
  createdAt?: string;
}): EventLog {
  return EventLogSchema.parse({
    id: crypto.randomUUID(),
    cycle_number: args.cycleNumber,
    event_type: args.eventType,
    source_agent_id: args.sourceAgentId ?? null,
    summary: args.summary,
    payload: args.payload ?? {},
    created_at: args.createdAt ?? new Date().toISOString(),
  });
}
