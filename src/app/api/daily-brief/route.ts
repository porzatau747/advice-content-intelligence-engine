import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/daily-brief
export async function GET() {
  try {
    const briefs = await prisma.dailyBrief.findMany({
      include: {
        clipIdeas: true,
      },
      orderBy: {
        briefDate: "desc",
      },
    });
    return NextResponse.json(briefs);
  } catch (error: any) {
    console.error("Failed to fetch daily briefs:", error);
    return NextResponse.json(
      { error: "Failed to fetch daily briefs." },
      { status: 500 }
    );
  }
}
