import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

interface Params {
  params: Promise<{ id: string }>;
}

// GET /api/daily-brief/[id]
export async function GET(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const brief = await prisma.dailyBrief.findUnique({
      where: { id },
      include: {
        clipIdeas: {
          include: {
            selectedStoryFormat: true,
          },
        },
      },
    });

    if (!brief) {
      return NextResponse.json({ error: "Daily brief not found." }, { status: 404 });
    }

    return NextResponse.json(brief);
  } catch (error: any) {
    console.error("Failed to fetch daily brief:", error);
    return NextResponse.json(
      { error: "Failed to fetch daily brief." },
      { status: 500 }
    );
  }
}

// DELETE /api/daily-brief/[id]
export async function DELETE(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    await prisma.dailyBrief.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to delete daily brief:", error);
    return NextResponse.json(
      { error: "Failed to delete daily brief." },
      { status: 500 }
    );
  }
}
