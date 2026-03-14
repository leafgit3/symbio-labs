import { getAgentMemories } from "@/lib/db/runtimeQueries";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const memories = await getAgentMemories(250);
  return NextResponse.json(memories);
}
