import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/external-signals
export async function GET() {
  try {
    const signals = await prisma.externalSignal.findMany({
      include: {
        analysis: true,
      },
      orderBy: {
        fetchedAt: "desc",
      },
    });
    return NextResponse.json(signals);
  } catch (error: any) {
    console.error("Failed to fetch external signals:", error);
    return NextResponse.json(
      { error: "Failed to fetch saved external signals." },
      { status: 500 }
    );
  }
}

// POST /api/external-signals
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sourceType, title, summary, sourceUrl, metrics, relatedKeywords } = body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json({ error: "Title is required." }, { status: 400 });
    }
    if (!sourceType || !["youtube_api", "google_trends"].includes(sourceType)) {
      return NextResponse.json({ error: "Valid sourceType is required." }, { status: 400 });
    }

    // Check if the signal is already saved by checking URL
    if (sourceUrl) {
      const existing = await prisma.externalSignal.findFirst({
        where: { sourceUrl },
      });
      if (existing) {
        return NextResponse.json(existing); // Already saved, return it
      }
    }

    const newSignal = await prisma.externalSignal.create({
      data: {
        sourceType,
        title: title.trim(),
        summary: summary || null,
        sourceUrl: sourceUrl || null,
        metrics: metrics ? JSON.stringify(metrics) : null,
        relatedKeywords: relatedKeywords ? JSON.stringify(relatedKeywords) : null,
        status: "saved",
      },
    });

    return NextResponse.json(newSignal, { status: 201 });
  } catch (error: any) {
    console.error("Failed to create external signal:", error);
    return NextResponse.json(
      { error: "Failed to save external signal." },
      { status: 500 }
    );
  }
}
