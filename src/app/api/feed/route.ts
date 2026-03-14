import { getFeedPosts } from "@/lib/db/runtimeQueries";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const posts = await getFeedPosts(50);
  return NextResponse.json(posts);
}
