import { readStore } from "@/lib/db/store";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const store = readStore();
  const agents = [...store.agents].sort((a, b) => a.name.localeCompare(b.name));
  return NextResponse.json(agents);
}
