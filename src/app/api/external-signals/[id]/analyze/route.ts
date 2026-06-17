import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateJSON } from "@/lib/gemini";
import { prompts } from "@/lib/prompts";

interface Params {
  params: Promise<{ id: string }>;
}

interface AnalysisResult {
  signalSummary: string;
  audienceRelevance: string;
  suggestedContentAngle: string;
  possibleHooks: string[];
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params;

    // 1. Fetch signal
    const signal = await prisma.externalSignal.findUnique({
      where: { id },
    });

    if (!signal) {
      return NextResponse.json({ error: "External signal not found." }, { status: 404 });
    }

    // 2. Run LLM Analysis
    const prompt = prompts.analyzeExternalSignal(
      signal.title,
      signal.summary || "No description provided."
    );
    const analysisData = await generateJSON<AnalysisResult>(prompt);

    // 3. Save analysis using transaction
    const updatedSignal = await prisma.$transaction(async (tx) => {
      // Upsert analysis
      await tx.externalSignalAnalysis.upsert({
        where: { externalSignalId: id },
        create: {
          externalSignalId: id,
          signalSummary: analysisData.signalSummary,
          audienceRelevance: analysisData.audienceRelevance,
          suggestedContentAngle: analysisData.suggestedContentAngle,
          possibleHooks: JSON.stringify(analysisData.possibleHooks),
        },
        update: {
          signalSummary: analysisData.signalSummary,
          audienceRelevance: analysisData.audienceRelevance,
          suggestedContentAngle: analysisData.suggestedContentAngle,
          possibleHooks: JSON.stringify(analysisData.possibleHooks),
        },
      });

      // Update parent status
      return await tx.externalSignal.update({
        where: { id },
        data: {
          status: "analyzed",
        },
        include: {
          analysis: true,
        },
      });
    });

    return NextResponse.json(updatedSignal);
  } catch (error: any) {
    console.error("External signal analysis error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to analyze external signal." },
      { status: 500 }
    );
  }
}
