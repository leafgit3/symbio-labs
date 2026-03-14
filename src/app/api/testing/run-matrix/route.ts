import { ScenarioMatrixInputSchema } from "@/lib/schemas";
import { runCycle } from "@/lib/simulation/runCycle";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json();
  const input = ScenarioMatrixInputSchema.parse(body);

  const summaries = [];

  for (const scenario of input.scenarios) {
    for (let i = 0; i < scenario.cycles; i += 1) {
      const result = await runCycle({
        scenarioLabel: scenario.label,
        worldBrief: scenario.worldBrief,
        agentOverrides: scenario.agentOverrides,
      });

      summaries.push({
        scenarioLabel: scenario.label,
        run: i + 1,
        cycleNumber: result.runSummary.cycleNumber,
        delta: result.runSummary.delta,
        postsCreated: result.runSummary.postsCreated,
        worldBriefUsed: result.runSummary.worldBriefUsed,
      });
    }
  }

  return NextResponse.json({ summaries });
}
