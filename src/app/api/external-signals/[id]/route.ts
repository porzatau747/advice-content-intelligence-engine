import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

interface Params {
  params: Promise<{ id: string }>;
}

// DELETE /api/external-signals/[id]
export async function DELETE(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    await prisma.externalSignal.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to delete external signal:", error);
    return NextResponse.json(
      { error: "Failed to delete saved external signal." },
      { status: 500 }
    );
  }
}
