import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/story-formats
export async function GET() {
  try {
    const formats = await prisma.storyFormat.findMany({
      orderBy: {
        name: "asc",
      },
    });
    return NextResponse.json(formats);
  } catch (error: any) {
    console.error("Failed to fetch story formats:", error);
    return NextResponse.json(
      { error: "Failed to fetch story formats." },
      { status: 500 }
    );
  }
}
