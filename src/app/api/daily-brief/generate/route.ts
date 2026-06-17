import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateJSON } from "@/lib/gemini";
import { prompts } from "@/lib/prompts";

interface ClipInput {
  contentGoal: "educate" | "product_conversion" | "repair_service";
  title: string;
  selectedStoryFormatId: string;
  sourceInputsUsed: string;
  hook: string;
  whyThisClipMatters: string;
  shotList: string[];
  onScreenText: string;
  voiceOver: string;
  capcutStyle: string;
  caption: string;
  hashtags: string;
  difficulty: "easy" | "medium" | "hard";
  verificationNeeded: boolean;
  cta: string;
}

interface BriefGeneratorResult {
  summary: string;
  customerInsight: string;
  clips: ClipInput[];
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { painPointIds, externalSignalIds } = body as {
      painPointIds: string[];
      externalSignalIds: string[];
    };

    if (!painPointIds || !Array.isArray(painPointIds) || painPointIds.length === 0) {
      return NextResponse.json(
        { error: "At least one Customer Pain Point (painPointIds) must be selected." },
        { status: 400 }
      );
    }

    // 1. Fetch selected pain points & their analysis
    const painPoints = await prisma.customerPainPoint.findMany({
      where: { id: { in: painPointIds } },
      include: { analysis: true },
    });

    if (painPoints.length === 0) {
      return NextResponse.json({ error: "Selected pain points not found." }, { status: 404 });
    }

    // 2. Fetch selected external signals & their analysis (optional but recommended)
    const signals = externalSignalIds && Array.isArray(externalSignalIds) && externalSignalIds.length > 0
      ? await prisma.externalSignal.findMany({
          where: { id: { in: externalSignalIds } },
          include: { analysis: true },
        })
      : [];

    // 3. Fetch all story formats (needed for selection)
    const formats = await prisma.storyFormat.findMany();
    if (formats.length === 0) {
      return NextResponse.json(
        { error: "No Story Formats found. Please run the database seeding first." },
        { status: 500 }
      );
    }

    // 4. Run LLM Daily Brief Generation
    const prompt = prompts.generateDailyBrief(painPoints, signals, formats);
    const briefData = await generateJSON<BriefGeneratorResult>(prompt);

    // Validate that the returned formats actually match database formats to avoid foreign key errors
    const formatIds = new Set(formats.map((f) => f.id));
    const fallbackFormatId = formats[0].id;

    // 5. Create DailyBrief and associated ClipIdeas in database transaction
    const createdBrief = await prisma.$transaction(async (tx) => {
      const dbBrief = await tx.dailyBrief.create({
        data: {
          briefDate: new Date(),
          summary: briefData.summary,
          customerInsight: briefData.customerInsight,
          painPointIds: JSON.stringify(painPointIds),
          externalSignalIds: JSON.stringify(externalSignalIds || []),
          status: "draft",
        },
      });

      // Map clips to database ClipIdea records
      for (const clip of briefData.clips) {
        // Fallback in case LLM outputs an invalid story format ID
        let selectedFormatId = clip.selectedStoryFormatId;
        if (!formatIds.has(selectedFormatId)) {
          // Try matching by name
          const matchedFormat = formats.find(
            (f) => f.name.toLowerCase() === selectedFormatId.toLowerCase()
          );
          selectedFormatId = matchedFormat ? matchedFormat.id : fallbackFormatId;
        }

        await tx.clipIdea.create({
          data: {
            dailyBriefId: dbBrief.id,
            title: clip.title,
            hook: clip.hook,
            selectedStoryFormatId: selectedFormatId,
            shotList: JSON.stringify(clip.shotList || []),
            onScreenText: clip.onScreenText || "",
            voiceOver: clip.voiceOver || "",
            capcutStyle: clip.capcutStyle || "",
            caption: clip.caption || "",
            hashtags: clip.hashtags || "",
            difficulty: clip.difficulty || "medium",
            cta: clip.cta || "",
            verificationNeeded: clip.verificationNeeded || false,
            contentGoal: clip.contentGoal || "educate",
            whyThisClipMatters: clip.whyThisClipMatters || "",
          },
        });
      }

      return await tx.dailyBrief.findUnique({
        where: { id: dbBrief.id },
        include: {
          clipIdeas: {
            include: {
              selectedStoryFormat: true,
            },
          },
        },
      });
    });

    return NextResponse.json(createdBrief, { status: 201 });
  } catch (error: any) {
    console.error("Daily brief generation error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate daily brief." },
      { status: 500 }
    );
  }
}
