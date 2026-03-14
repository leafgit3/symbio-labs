import { z } from "zod";

export const CycleRunStatusSchema = z.enum(["running", "completed", "failed"]);

export const CycleRunSchema = z.object({
  id: z.string().uuid(),
  cycle_number: z.number().int().nonnegative(),
  status: CycleRunStatusSchema,
  started_at: z.string().datetime(),
  finished_at: z.string().datetime().nullable(),
  summary: z.string(),
  created_at: z.string().datetime(),
});

export type CycleRun = z.infer<typeof CycleRunSchema>;
