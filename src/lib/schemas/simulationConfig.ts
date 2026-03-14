import { z } from "zod";

export const SimulationConfigSchema = z.object({
  worldBrief: z.string(),
  updatedAt: z.string().datetime(),
});

export type SimulationConfig = z.infer<typeof SimulationConfigSchema>;
