import { z } from "zod";

export const AgentSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  role: z.string(),
  goals: z.array(z.string()),
  traits: z.array(z.string()),
  status: z.string(),
  memory_summary: z.string(),
  last_action_at: z.string().datetime().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type Agent = z.infer<typeof AgentSchema>;
