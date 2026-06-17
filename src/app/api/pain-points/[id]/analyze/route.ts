import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateJSON } from "@/lib/gemini";
import { prompts } from "@/lib/prompts";

interface Params {
  params: Promise<{ id: string }>;
}

interface AnalysisResult {
  corePainPoint: string;
  hiddenFear: string;
  realCustomerNeed: string;
  productServiceOpportunity: string;
  suitableContentAngle: string;
  verificationRisks: string;
  category: string;
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params;

    // 1. Fetch pain point
    const painPoint = await prisma.customerPainPoint.findUnique({
      where: { id },
    });

    if (!painPoint) {
      return NextResponse.json({ error: "Pain point not found." }, { status: 404 });
    }

    // 2. Run LLM Analysis
    const prompt = prompts.analyzeCustomerPainPoint(painPoint.rawText);
    const analysisData = await generateJSON<AnalysisResult>(prompt);

    // 3. Save analysis using a transaction
    const updatedPainPoint = await prisma.$transaction(async (tx) => {
      // Upsert analysis
      await tx.painPointAnalysis.upsert({
        where: { customerPainPointId: id },
        create: {
          customerPainPointId: id,
          corePainPoint: analysisData.corePainPoint,
          hiddenFear: analysisData.hiddenFear,
          realCustomerNeed: analysisData.realCustomerNeed,
          productServiceOpportunity: analysisData.productServiceOpportunity,
          suitableContentAngle: analysisData.suitableContentAngle,
          verificationRisks: analysisData.verificationRisks,
        },
        update: {
          corePainPoint: analysisData.corePainPoint,
          hiddenFear: analysisData.hiddenFear,
          realCustomerNeed: analysisData.realCustomerNeed,
          productServiceOpportunity: analysisData.productServiceOpportunity,
          suitableContentAngle: analysisData.suitableContentAngle,
          verificationRisks: analysisData.verificationRisks,
        },
      });

      // Update parent status & category
      return await tx.customerPainPoint.update({
        where: { id },
        data: {
          status: "analyzed",
          category: analysisData.category || painPoint.category || "other",
        },
        include: {
          analysis: true,
        },
      });
    });

    return NextResponse.json(updatedPainPoint);
  } catch (error: any) {
    console.error("Pain point analysis error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to analyze customer pain point." },
      { status: 500 }
    );
  }
}
