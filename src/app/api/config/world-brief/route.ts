import { mutateStore, readStore } from "@/lib/db/store";
import { SimulationConfigSchema } from "@/lib/schemas";
import { NextResponse } from "next/server";
import { z } from "zod";

const UpdateWorldBriefSchema = z.object({
  worldBrief: z.string().trim().min(1).max(3000),
});

export const dynamic = "force-dynamic";

export async function GET() {
  const store = readStore();
  return NextResponse.json(SimulationConfigSchema.parse(store.simulationConfig));
}

export async function POST(request: Request) {
  const body = await request.json();
  const { worldBrief } = UpdateWorldBriefSchema.parse(body);

  const config = mutateStore((store) => {
    store.simulationConfig = {
      worldBrief,
      updatedAt: new Date().toISOString(),
    };

    return store.simulationConfig;
  });

  return NextResponse.json(SimulationConfigSchema.parse(config));
}
