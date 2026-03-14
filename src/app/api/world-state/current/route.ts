import { readStore } from "@/lib/db/store";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const store = readStore();
  const worldState = store.worldStates[store.worldStates.length - 1];
  return NextResponse.json(worldState);
}
