import { z } from "zod";

export const FeedPostTypeSchema = z.enum([
  "statement",
  "reaction",
  "signal",
  "rumor",
  "support",
  "audit_note",
]);

export const FeedPostSchema = z.object({
  id: z.string().uuid(),
  cycle_number: z.number().int().nonnegative(),
  agent_id: z.string().uuid(),
  post_type: FeedPostTypeSchema,
  content: z.string(),
  created_at: z.string().datetime(),
});

export type FeedPost = z.infer<typeof FeedPostSchema>;
