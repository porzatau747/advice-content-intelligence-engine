import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/pain-points
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const idsOnly = searchParams.get("idsOnly") === "true";

    if (idsOnly) {
      const painPoints = await prisma.customerPainPoint.findMany({
        select: { id: true, nescenTicketId: true },
        where: { nescenTicketId: { not: null } },
      });
      return NextResponse.json(painPoints);
    }

    const painPoints = await prisma.customerPainPoint.findMany({
      include: {
        analysis: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    return NextResponse.json(painPoints);
  } catch (error: any) {
    console.error("Failed to fetch pain points:", error);
    return NextResponse.json(
      { error: "Failed to fetch customer pain points." },
      { status: 500 }
    );
  }
}

// POST /api/pain-points
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { rawText, countSeen, relatedProductOrService, customerType, urgencyLevel, nescenTicketId } = body;

    if (!rawText || typeof rawText !== "string" || !rawText.trim()) {
      return NextResponse.json(
        { error: "วันนี้ลูกค้าถาม/เจอปัญหาเรื่องอะไรเยอะที่สุด? (rawText) is required." },
        { status: 400 }
      );
    }

    if (nescenTicketId) {
      const existing = await prisma.customerPainPoint.findFirst({
        where: { nescenTicketId },
      });
      if (existing) {
        return NextResponse.json(existing);
      }
    }

    const newPainPoint = await prisma.customerPainPoint.create({
      data: {
        rawText: rawText.trim(),
        countSeen: countSeen ? parseInt(countSeen, 10) : 1,
        relatedProductOrService: relatedProductOrService || null,
        customerType: customerType || null,
        urgencyLevel: urgencyLevel || "medium",
        status: "pending",
        nescenTicketId: nescenTicketId || null,
      },
    });

    return NextResponse.json(newPainPoint, { status: 201 });
  } catch (error: any) {
    console.error("Failed to create pain point:", error);
    return NextResponse.json(
      { error: "Failed to create customer pain point." },
      { status: 500 }
    );
  }
}
