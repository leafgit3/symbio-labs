import { z } from "zod";

export const AgentMemoryTypeSchema = z.enum([
  "observation",
  "event_memory",
  "social_memory",
  "world_memory",
  "self_adjustment",
  "summary",
]);

export const AgentMemorySchema = z.object({
  id: z.string().uuid(),
  agent_id: z.string().uuid(),
  memory_type: AgentMemoryTypeSchema,
  content: z.string(),
  salience: z.number(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type AgentMemory = z.infer<typeof AgentMemorySchema>;
