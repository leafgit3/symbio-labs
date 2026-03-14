import { z } from "zod";

export const WorldStateSchema = z.object({
  id: z.string().uuid(),
  cycle_number: z.number().int().nonnegative(),
  summary: z.string(),
  cohesion: z.number().min(0).max(100),
  trust: z.number().min(0).max(100),
  noise: z.number().min(0).max(100),
  active_events: z.array(z.string()),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type WorldState = z.infer<typeof WorldStateSchema>;
