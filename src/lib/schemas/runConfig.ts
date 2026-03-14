import { z } from "zod";

export const AgentOverrideSchema = z.object({
  agentId: z.string().uuid(),
  role: z.string().min(2).max(120).optional(),
  goals: z.array(z.string().min(1).max(200)).min(1).max(12).optional(),
  traits: z.array(z.string().min(1).max(120)).min(1).max(12).optional(),
});

export const RunCycleInputSchema = z.object({
  scenarioLabel: z.string().min(1).max(120).optional(),
  worldBrief: z.string().min(1).max(3000).optional(),
  agentOverrides: z.array(AgentOverrideSchema).max(20).optional(),
});

export const RunSummarySchema = z.object({
  cycleNumber: z.number().int().nonnegative(),
  scenarioLabel: z.string(),
  worldBriefUsed: z.string(),
  postsCreated: z.number().int().nonnegative(),
  delta: z.object({
    cohesion: z.number(),
    trust: z.number(),
    noise: z.number(),
  }),
  agentsUsed: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string(),
      role: z.string(),
      goals: z.array(z.string()),
      traits: z.array(z.string()),
    }),
  ),
});

export const ScenarioMatrixItemSchema = z.object({
  label: z.string().min(1).max(120),
  worldBrief: z.string().min(1).max(3000).optional(),
  agentOverrides: z.array(AgentOverrideSchema).optional(),
  cycles: z.number().int().min(1).max(20).default(1),
});

export const ScenarioMatrixInputSchema = z.object({
  scenarios: z.array(ScenarioMatrixItemSchema).min(1).max(24),
});

export type RunCycleInput = z.infer<typeof RunCycleInputSchema>;
export type RunSummary = z.infer<typeof RunSummarySchema>;
export type ScenarioMatrixInput = z.infer<typeof ScenarioMatrixInputSchema>;
