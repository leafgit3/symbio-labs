import { z } from "zod";

export const DecisionStanceSchema = z.enum(["escalate", "contain", "monitor"]);
export const StanceSourceSchema = z.enum(["organic", "orchestrator_fallback"]);
export const StanceCountsSchema = z.object({
  escalate: z.number().int().nonnegative(),
  contain: z.number().int().nonnegative(),
  monitor: z.number().int().nonnegative(),
});

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
      stance: DecisionStanceSchema.optional(),
      stanceSource: StanceSourceSchema.optional(),
      confidence: z.number().min(0).max(1).optional(),
      fallbackReason: z.string().min(1).max(300).optional(),
    }),
  ),
  diagnostics: z
    .object({
      stanceCounts: z.object({
        organic: StanceCountsSchema,
        effective: StanceCountsSchema,
      }),
      forcedSlotsCount: z.number().int().nonnegative(),
      promotedEventsCount: z.number().int().nonnegative(),
      contradictionScore: z.number().min(0).max(1),
      salienceAvg: z.number().min(0).max(1),
      salienceStdDev: z.number().min(0).max(1),
      llmFallbackCount: z.number().int().nonnegative().optional(),
      llmSuccessCount: z.number().int().nonnegative().optional(),
      llmSchemaRepairCount: z.number().int().nonnegative().optional(),
      llmFallbackReasonCounts: z.record(z.string(), z.number().int().nonnegative()).optional(),
      stanceGuidanceSoftCount: z.number().int().nonnegative().optional(),
      stanceGuidanceTargetedCount: z.number().int().nonnegative().optional(),
      eventPromotionMode: z.enum(["none", "fresh", "hybrid", "carryover"]).optional(),
      eventPromotionReasonTags: z.array(z.string()).optional(),
      eventPromotionCarryoverCount: z.number().int().nonnegative().optional(),
      eventPromotionSignalCount: z.number().int().nonnegative().optional(),
      eventPromotionPreviousCount: z.number().int().nonnegative().optional(),
      eventPromotionAmbiguityScore: z.number().min(0).max(1).optional(),
      eventPromotionSplitEvidence: z.boolean().optional(),
      envelopeApplied: z.boolean().optional(),
      trustDeltaRaw: z.number().optional(),
      trustDeltaAdjusted: z.number().optional(),
      noiseDeltaRaw: z.number().optional(),
      noiseDeltaAdjusted: z.number().optional(),
      envelopeDampingFactor: z.number().min(0).max(1).optional(),
      trustDeltaClamp: z.number().positive().optional(),
      noiseDeltaClamp: z.number().positive().optional(),
    })
    .optional(),
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
export type DecisionStance = z.infer<typeof DecisionStanceSchema>;
export type StanceSource = z.infer<typeof StanceSourceSchema>;
