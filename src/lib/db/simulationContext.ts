import { getSupabaseServiceClient } from "@/lib/db/supabase";

export const DEFAULT_WORLD_BRIEF =
  "The citadel is a tiny digital polity testing how coordination, rumor, and skepticism shape trust over repeated cycles.";

type SimulationContext = {
  sessionId: string;
  worldBrief: string;
};

export async function createSimulationSession(label: string): Promise<string> {
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Simulation session creation requires Supabase runtime.");
  }

  const now = new Date().toISOString();
  const sessionId = crypto.randomUUID();
  const { error } = await supabase.from("simulation_sessions").insert({
    id: sessionId,
    label,
    started_at: now,
    created_at: now,
  });

  if (error) {
    throw new Error(`Failed creating simulation session: ${error.message}`);
  }

  return sessionId;
}

export async function getOrCreateSimulationContext(): Promise<SimulationContext> {
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Simulation context requires Supabase runtime.");
  }

  const { data: config, error: configError } = await supabase
    .from("simulation_config")
    .select("id, world_brief, active_session_id")
    .eq("id", "default")
    .maybeSingle();

  if (configError) {
    throw new Error(`Failed reading simulation_config: ${configError.message}`);
  }

  if (!config) {
    const sessionId = await createSimulationSession("initial");
    const now = new Date().toISOString();
    const { error: insertConfigError } = await supabase.from("simulation_config").insert({
      id: "default",
      world_brief: DEFAULT_WORLD_BRIEF,
      active_session_id: sessionId,
      updated_at: now,
    });

    if (insertConfigError) {
      throw new Error(`Failed seeding simulation_config: ${insertConfigError.message}`);
    }

    return {
      sessionId,
      worldBrief: DEFAULT_WORLD_BRIEF,
    };
  }

  let sessionId = (config as { active_session_id?: string | null }).active_session_id ?? null;

  if (sessionId) {
    const { data: sessionRow, error: sessionError } = await supabase
      .from("simulation_sessions")
      .select("id")
      .eq("id", sessionId)
      .maybeSingle();

    if (sessionError) {
      throw new Error(`Failed reading simulation session: ${sessionError.message}`);
    }

    if (sessionRow) {
      return {
        sessionId,
        worldBrief: (config as { world_brief?: string | null }).world_brief ?? DEFAULT_WORLD_BRIEF,
      };
    }
  }

  sessionId = await createSimulationSession("initial");
  const { error: updateConfigError } = await supabase
    .from("simulation_config")
    .update({ active_session_id: sessionId, updated_at: new Date().toISOString() })
    .eq("id", "default");

  if (updateConfigError) {
    throw new Error(`Failed setting active simulation session: ${updateConfigError.message}`);
  }

  return {
    sessionId,
    worldBrief: (config as { world_brief?: string | null }).world_brief ?? DEFAULT_WORLD_BRIEF,
  };
}
