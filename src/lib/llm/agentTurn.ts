import { Agent } from "@/lib/schemas";

export type AgentTurnInput = {
  agent: Agent;
  worldBrief: string;
  worldSummary: string;
  recentFeed: string[];
  recentMemories: string[];
  stanceGuidance?: string;
};

export type LlmFailureCode =
  | "missing_config"
  | "network_error"
  | "timeout_error"
  | "http_error"
  | "empty_response"
  | "json_missing"
  | "json_parse_error";

export type LlmTurnRequestResult =
  | {
      ok: true;
      output: unknown;
      model: string;
      repaired: boolean;
      attempts: number;
    }
  | {
      ok: false;
      attempted: boolean;
      errorCode: LlmFailureCode;
      errorDetail: string;
      model?: string;
      attempts: number;
    };

const MODEL_CANDIDATES = ["openai-gpt-oss-20b", "n/a"];
const REQUEST_TIMEOUT_MS = 25_000;
const TURN_JSON_SHAPE =
  '{"actionType":"post_to_feed|react_to_recent_post|update_memory|no_op","postType":"statement|reaction|signal|rumor|support|audit_note|null","postContent":"string|null","stance":"escalate|contain|monitor","confidence":number,"memoryContent":"string","delta":{"cohesion":number,"trust":number,"noise":number}}';

type ChatMessage = {
  role: "system" | "user";
  content: string;
};

type LlmCompletionResult =
  | {
      ok: true;
      text: string;
    }
  | {
      ok: false;
      errorCode: LlmFailureCode;
      errorDetail: string;
    };

function readLlmSettings() {
  return {
    baseUrl: process.env.LLM_BASE_URL,
    apiKey: process.env.LLM_API_KEY,
  };
}

export async function requestAgentTurnFromLlm(input: AgentTurnInput): Promise<LlmTurnRequestResult> {
  const settings = readLlmSettings();

  if (!settings.baseUrl || !settings.apiKey) {
    return {
      ok: false,
      attempted: false,
      errorCode: "missing_config",
      errorDetail: "LLM_BASE_URL or LLM_API_KEY is missing.",
      attempts: 0,
    };
  }

  const endpoint = `${settings.baseUrl.replace(/\/$/, "")}/api/v1/chat/completions`;
  let attempts = 0;

  const systemPrompt = [
    "You are an agent simulator.",
    "Return JSON only.",
    "Do not include explanations or reasoning text.",
    "Use this JSON shape exactly:",
    TURN_JSON_SHAPE,
    "Always output one stance. Avoid defaulting to monitor unless evidence is genuinely insufficient.",
    "confidence must be a number from 0 to 1.",
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
    ...(input.stanceGuidance ? [`Stance guidance: ${input.stanceGuidance}`] : []),
    "Return a single action for this cycle.",
  ].join("\n");

  let lastFailure: Omit<Extract<LlmTurnRequestResult, { ok: false }>, "ok" | "attempted"> = {
    errorCode: "empty_response",
    errorDetail: "No model candidate produced valid output.",
    attempts: 0,
  };

  for (const model of MODEL_CANDIDATES) {
    attempts += 1;
    const primary = await requestCompletion({
      endpoint,
      apiKey: settings.apiKey,
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    if (!primary.ok) {
      lastFailure = {
        model,
        errorCode: primary.errorCode,
        errorDetail: primary.errorDetail,
        attempts,
      };
      continue;
    }

    const primaryParsed = parseJsonFromText(primary.text);
    if (primaryParsed.ok) {
      return {
        ok: true,
        output: primaryParsed.output,
        model,
        repaired: false,
        attempts,
      };
    }

    attempts += 1;
    const repair = await requestCompletion({
      endpoint,
      apiKey: settings.apiKey,
      model,
      messages: [
        {
          role: "system",
          content: [
            "You are a strict JSON repair assistant.",
            "Convert the given assistant output into valid JSON only.",
            "Do not add reasoning text.",
            "Use this exact shape:",
            TURN_JSON_SHAPE,
            "If actionType is no_op then postType and postContent must be null.",
          ].join("\n"),
        },
        {
          role: "user",
          content: [
            "Repair this output into valid JSON using the required shape.",
            "Original output:",
            primary.text,
          ].join("\n"),
        },
      ],
    });

    if (!repair.ok) {
      lastFailure = {
        model,
        errorCode: repair.errorCode,
        errorDetail: repair.errorDetail,
        attempts,
      };
      continue;
    }

    const repairedParsed = parseJsonFromText(repair.text);
    if (repairedParsed.ok) {
      return {
        ok: true,
        output: repairedParsed.output,
        model,
        repaired: true,
        attempts,
      };
    }

    lastFailure = {
      model,
      errorCode: repairedParsed.errorCode,
      errorDetail: repairedParsed.errorDetail,
      attempts,
    };
  }

  return {
    ok: false,
    attempted: attempts > 0,
    ...lastFailure,
    attempts,
  };
}

async function requestCompletion(args: {
  endpoint: string;
  apiKey: string;
  model: string;
  messages: ChatMessage[];
}): Promise<LlmCompletionResult> {
  let response: Response;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    response = await fetch(args.endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${args.apiKey}`,
      },
      body: JSON.stringify({
        model: args.model,
        messages: args.messages,
        stream: false,
      }),
      cache: "no-store",
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timeout);

    if (error instanceof Error && error.name === "AbortError") {
      return {
        ok: false,
        errorCode: "timeout_error",
        errorDetail: `Timed out after ${REQUEST_TIMEOUT_MS}ms.`,
      };
    }

    return {
      ok: false,
      errorCode: "network_error",
      errorDetail: error instanceof Error ? error.message : "Unknown network error.",
    };
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    return {
      ok: false,
      errorCode: "http_error",
      errorDetail: `HTTP ${response.status} from provider.`,
    };
  }

  const payload = await response.json();
  const text = extractAssistantText(payload);
  if (!text) {
    return {
      ok: false,
      errorCode: "empty_response",
      errorDetail: "Provider response had no assistant message content.",
    };
  }

  return {
    ok: true,
    text,
  };
}

function parseJsonFromText(text: string):
  | {
      ok: true;
      output: unknown;
    }
  | {
      ok: false;
      errorCode: Extract<LlmFailureCode, "json_missing" | "json_parse_error">;
      errorDetail: string;
    } {
  const jsonText = extractFirstJsonObject(text);
  if (!jsonText) {
    return {
      ok: false,
      errorCode: "json_missing",
      errorDetail: "Assistant content did not contain a JSON object.",
    };
  }

  try {
    return {
      ok: true,
      output: JSON.parse(jsonText),
    };
  } catch (error) {
    return {
      ok: false,
      errorCode: "json_parse_error",
      errorDetail: error instanceof Error ? error.message : "Failed to parse JSON object.",
    };
  }
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
