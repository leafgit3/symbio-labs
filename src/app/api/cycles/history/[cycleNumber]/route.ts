import { getCycleDetails } from "@/lib/db/runtimeQueries";
import { NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const ParamsSchema = z.object({
  cycleNumber: z.string().regex(/^\d+$/),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ cycleNumber: string }> },
) {
  const parsedParams = ParamsSchema.parse(await params);
  const cycleNumber = Number(parsedParams.cycleNumber);

  const details = await getCycleDetails(cycleNumber);
  return NextResponse.json(details);
}
