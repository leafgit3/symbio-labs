import { updateAgent } from "@/lib/db/runtimeQueries";
import { UpdateAgentInputSchema } from "@/lib/schemas";
import { NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{
    agentId: string;
  }>;
};

const ParamsSchema = z.object({
  agentId: z.string().uuid(),
});

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { agentId } = ParamsSchema.parse(await params);
    const input = UpdateAgentInputSchema.parse(await request.json());
    const agent = await updateAgent(agentId, input);
    return NextResponse.json(agent);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid payload." }, { status: 400 });
    }

    const message = error instanceof Error ? error.message : "Failed to update agent.";
    const status = message === "Agent not found." ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
