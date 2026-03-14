export type AgentProfile = {
  role: string;
  bias: string;
};

export const AGENT_PROFILES: Record<string, AgentProfile> = {
  coordinator: {
    role: "Coordinator / Distributor",
    bias: "Stabilizes cohesion and continuity.",
  },
  surface: {
    role: "Surface / Rumor Agent",
    bias: "Amplifies weak signals and social noise.",
  },
  auditor: {
    role: "Auditor / Skeptic",
    bias: "Questions assumptions and tests consistency.",
  },
};
