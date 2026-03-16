import { getSimulationContextInfo } from "@/lib/db/runtimeQueries";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const context = await getSimulationContextInfo();
  return NextResponse.json(context);
}
