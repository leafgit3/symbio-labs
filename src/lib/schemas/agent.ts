import { z } from "zod";

const AgentStringArraySchema = z.array(z.string().trim().min(1).max(120)).max(12);

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

export const CreateAgentInputSchema = z.object({
  name: z.string().trim().min(2).max(80),
  role: z.string().trim().min(2).max(120),
  goals: AgentStringArraySchema,
  traits: AgentStringArraySchema,
  memory_summary: z.string().trim().max(500).default(""),
});

export const UpdateAgentInputSchema = CreateAgentInputSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "At least one field is required.",
);

export type Agent = z.infer<typeof AgentSchema>;
export type CreateAgentInput = z.infer<typeof CreateAgentInputSchema>;
export type UpdateAgentInput = z.infer<typeof UpdateAgentInputSchema>;
