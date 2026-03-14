import { getWorldStateCurrent } from "@/lib/db/runtimeQueries";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const worldState = await getWorldStateCurrent();
  return NextResponse.json(worldState);
}
