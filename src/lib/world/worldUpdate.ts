import { WorldState, WorldStateSchema } from "@/lib/schemas";

function clampMetric(value: number): number {
  return Math.max(0, Math.min(100, Number(value.toFixed(1))));
}

export function buildWorldStateUpdate(args: {
  cycleNumber: number;
  prev: WorldState;
  delta: { cohesion: number; trust: number; noise: number };
  summary: string;
  activeEvents?: string[];
}): WorldState {
  const now = new Date().toISOString();
  return WorldStateSchema.parse({
    id: crypto.randomUUID(),
    cycle_number: args.cycleNumber,
    summary: args.summary,
    cohesion: clampMetric(args.prev.cohesion + args.delta.cohesion),
    trust: clampMetric(args.prev.trust + args.delta.trust),
    noise: clampMetric(args.prev.noise + args.delta.noise),
    active_events: args.activeEvents ?? [],
    created_at: now,
    updated_at: now,
  });
}
