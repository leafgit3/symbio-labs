import { z } from "zod";

export const EventTypeSchema = z.enum([
  "cycle_started",
  "agent_action",
  "feed_post_created",
  "memory_updated",
  "world_state_changed",
  "minor_event_created",
  "cycle_finished",
]);

export const EventLogSchema = z.object({
  id: z.string().uuid(),
  cycle_number: z.number().int().nonnegative(),
  event_type: EventTypeSchema,
  source_agent_id: z.string().uuid().nullable(),
  summary: z.string(),
  payload: z.record(z.string(), z.unknown()),
  created_at: z.string().datetime(),
});

export type EventLog = z.infer<typeof EventLogSchema>;
