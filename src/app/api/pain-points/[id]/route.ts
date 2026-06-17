import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

interface Params {
  params: Promise<{ id: string }>;
}

// GET /api/pain-points/[id]
export async function GET(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const painPoint = await prisma.customerPainPoint.findUnique({
      where: { id },
      include: { analysis: true },
    });

    if (!painPoint) {
      return NextResponse.json({ error: "Pain point not found." }, { status: 404 });
    }

    return NextResponse.json(painPoint);
  } catch (error: any) {
    console.error("Failed to fetch pain point:", error);
    return NextResponse.json(
      { error: "Failed to fetch customer pain point." },
      { status: 500 }
    );
  }
}

// PATCH /api/pain-points/[id]
export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { rawText, countSeen, relatedProductOrService, customerType, urgencyLevel, category, status } = body;

    const updated = await prisma.customerPainPoint.update({
      where: { id },
      data: {
        ...(rawText !== undefined && { rawText: rawText.trim() }),
        ...(countSeen !== undefined && { countSeen: parseInt(countSeen, 10) }),
        ...(relatedProductOrService !== undefined && { relatedProductOrService }),
        ...(customerType !== undefined && { customerType }),
        ...(urgencyLevel !== undefined && { urgencyLevel }),
        ...(category !== undefined && { category }),
        ...(status !== undefined && { status }),
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Failed to update pain point:", error);
    return NextResponse.json(
      { error: "Failed to update customer pain point." },
      { status: 500 }
    );
  }
}

// DELETE /api/pain-points/[id]
export async function DELETE(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    await prisma.customerPainPoint.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to delete pain point:", error);
    return NextResponse.json(
      { error: "Failed to delete customer pain point." },
      { status: 500 }
    );
  }
}
