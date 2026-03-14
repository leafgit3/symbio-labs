import { hasSupabaseRuntime, getWorldBriefConfig, setWorldBrief, setWorldBriefFallback } from "@/lib/db/runtimeQueries";
import { SimulationConfigSchema } from "@/lib/schemas";
import { NextResponse } from "next/server";
import { z } from "zod";

const UpdateWorldBriefSchema = z.object({
  worldBrief: z.string().trim().min(1).max(3000),
});

export const dynamic = "force-dynamic";

export async function GET() {
  const config = await getWorldBriefConfig();
  return NextResponse.json(SimulationConfigSchema.parse(config));
}

export async function POST(request: Request) {
  const body = await request.json();
  const { worldBrief } = UpdateWorldBriefSchema.parse(body);

  const config = hasSupabaseRuntime() ? await setWorldBrief(worldBrief) : await setWorldBriefFallback(worldBrief);

  return NextResponse.json(SimulationConfigSchema.parse(config));
}
