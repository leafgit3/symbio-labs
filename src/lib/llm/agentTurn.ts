import { Agent } from "@/lib/schemas";

export type AgentTurnInput = {
  agent: Agent;
  worldBrief: string;
  worldSummary: string;
  recentFeed: string[];
  recentMemories: string[];
};

const MODEL_CANDIDATES = ["openai-gpt-oss-20b", "n/a"];

function readLlmSettings() {
  return {
    baseUrl: process.env.LLM_BASE_URL,
    apiKey: process.env.LLM_API_KEY,
  };
}

export async function requestAgentTurnFromLlm(input: AgentTurnInput): Promise<unknown | null> {
  const settings = readLlmSettings();

  if (!settings.baseUrl || !settings.apiKey) {
    return null;
  }

  const endpoint = `${settings.baseUrl.replace(/\/$/, "")}/api/v1/chat/completions`;

  const systemPrompt = [
    "You are an agent simulator.",
    "Return JSON only.",
    "Do not include explanations or reasoning text.",
    "Use this JSON shape exactly:",
    '{"actionType":"post_to_feed|react_to_recent_post|update_memory|no_op","postType":"statement|reaction|signal|rumor|support|audit_note|null","postContent":"string|null","memoryContent":"string","delta":{"cohesion":number,"trust":number,"noise":number}}',
    "Keep delta values between -3 and 3.",
    "If actionType is no_op, postType and postContent should be null.",
  ].join("\n");

  const userPrompt = [
    `Agent name: ${input.agent.name}`,
    `Agent role: ${input.agent.role}`,
    `Agent goals: ${input.agent.goals.join(", ")}`,
    `Agent traits: ${input.agent.traits.join(", ")}`,
    `World brief: ${input.worldBrief || "No brief provided."}`,
    `World summary: ${input.worldSummary}`,
    `Recent feed: ${input.recentFeed.join(" | ") || "none"}`,
    `Recent memories: ${input.recentMemories.join(" | ") || "none"}`,
    "Return a single action for this cycle.",
  ].join("\n");

  for (const model of MODEL_CANDIDATES) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${settings.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: false,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      continue;
    }

    const payload = await response.json();
    const text = extractAssistantText(payload);
    if (!text) {
      continue;
    }

    const jsonText = extractFirstJsonObject(text);
    if (!jsonText) {
      continue;
    }

    try {
      return JSON.parse(jsonText);
    } catch {
      continue;
    }
  }

  return null;
}

function extractAssistantText(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const choices = (payload as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || !choices.length) {
    return null;
  }

  const message = (choices[0] as { message?: { content?: unknown } }).message;
  if (!message || typeof message.content !== "string") {
    return null;
  }

  return message.content;
}

function extractFirstJsonObject(input: string): string | null {
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === "{") {
      if (depth === 0) {
        start = i;
      }
      depth += 1;
      continue;
    }

    if (char === "}") {
      if (depth === 0) {
        continue;
      }

      depth -= 1;
      if (depth === 0 && start >= 0) {
        return input.slice(start, i + 1);
      }
    }
  }

  return null;
}
