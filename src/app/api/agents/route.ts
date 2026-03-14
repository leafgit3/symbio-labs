import { createAgent, getAgents } from "@/lib/db/runtimeQueries";
import { CreateAgentInputSchema } from "@/lib/schemas";
import { NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET() {
  const agents = await getAgents();
  return NextResponse.json(agents);
}

export async function POST(request: Request) {
  try {
    const input = CreateAgentInputSchema.parse(await request.json());
    const agent = await createAgent(input);
    return NextResponse.json(agent, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid payload." }, { status: 400 });
    }

    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create agent." }, { status: 500 });
  }
}
