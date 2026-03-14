import { readStore } from "@/lib/db/store";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const store = readStore();
  const memories = [...store.agentMemories]
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .slice(0, 200);

  return NextResponse.json(memories);
}
