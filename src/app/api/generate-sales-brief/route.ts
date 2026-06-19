import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateJSON } from "@/lib/gemini";

interface TechBriefItem {
  painPointId: string;
  customerName: string;
  device: string;
  symptom: string;
  suggestedProductCode: string;
  suggestedProductName: string;
  upsellScript: string;
}

interface CashierBriefItem {
  painPointId: string;
  customerName: string;
  device: string;
  suggestedProductCode: string;
  suggestedProductName: string;
  actionScript: string;
}

interface BriefGeneratorResult {
  technicianBrief: TechBriefItem[];
  cashierTrap: CashierBriefItem[];
}

/**
 * Format matching brief results into readable markdown for DailyBrief display
 */
function formatMarkdownBrief(data: BriefGeneratorResult): string {
  let md = `# โพยการขายหน้าร้านประจำวัน (AI Sales Brief)\n\n`;

  md += `## 🛠️ โพยสำหรับช่างซ่อม (Technician Upsell Brief)\n`;
  if (data.technicianBrief && data.technicianBrief.length > 0) {
    data.technicianBrief.forEach((t, index) => {
      md += `### ${index + 1}. ลูกค้า: ${t.customerName} | อุปกรณ์: ${t.device}\n`;
      md += `- **อาการเสีย:** ${t.symptom}\n`;
      md += `- **สินค้า Upsell แนะนำ:** ${t.suggestedProductName} (รหัส: \`${t.suggestedProductCode}\`)\n`;
      md += `- **บทพูดเสนอขายของช่าง:** *"${t.upsellScript}"*\n\n`;
    });
  } else {
    md += `- *ไม่มีรายการเสนอขายเพิ่มสำหรับช่างในวันนี้*\n\n`;
  }

  md += `## 💵 โพยดักแคชเชียร์หน้าร้าน (Cashier Cross-Sell Trap)\n`;
  if (data.cashierTrap && data.cashierTrap.length > 0) {
    data.cashierTrap.forEach((c, index) => {
      md += `### ${index + 1}. ลูกค้า: ${c.customerName} | อุปกรณ์: ${c.device}\n`;
      md += `- **สินค้าจัดวางหน้าร้าน:** ${c.suggestedProductName} (รหัส: \`${c.suggestedProductCode}\`)\n`;
      md += `- **แผนหน้างานแคชเชียร์:** *"${c.actionScript}"*\n\n`;
    });
  } else {
    md += `- *ไม่มีรายการเสนอขายสำหรับแคชเชียร์ในวันนี้*\n\n`;
  }

  return md;
}

// POST /api/generate-sales-brief
export async function POST(request: Request) {
  try {
    // Determine target range for today's tickets
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // =========================================================================
    // 1. Rule-Based Filtering (คัดกรองก่อนส่งเพื่อประหยัด API Cost)
    // =========================================================================
    console.log("[Generate-Sales-Brief] Fetching today's pending customer pain points...");
    let painPoints = await prisma.customerPainPoint.findMany({
      where: {
        status: "pending",
        createdAt: {
          gte: startOfToday,
        },
      },
      include: {
        analysis: true,
      },
    });

    // Defensive Fallback: If no pending pain points found today,
    // fetch any pending pain points currently in the system to prevent empty briefs.
    if (painPoints.length === 0) {
      console.log("[Generate-Sales-Brief] No pending pain points today. Falling back to all pending pain points...");
      painPoints = await prisma.customerPainPoint.findMany({
        where: {
          status: "pending",
        },
        include: {
          analysis: true,
        },
      });
    }

    // Defensive Exit: If there are absolutely no pending pain points to analyze
    if (painPoints.length === 0) {
      return NextResponse.json({
        success: true,
        message: "ไม่มีรายการใบส่งซ่อมหรือปัญหาของลูกค้าหน้าร้านค้างวิเคราะห์อยู่ในระบบ (No pending customer pain points to analyze)",
        dailyBrief: null,
      });
    }

    console.log(`[Generate-Sales-Brief] Found ${painPoints.length} pain points to process.`);

    // Fetch StockItems meeting business rules: Slow-moving (>90 days in stock) OR High Margin (>30%)
    // Sort by age and profitability, limit to Top 15 to control context window and LLM cost.
    console.log("[Generate-Sales-Brief] Fetching high-priority stock items...");
    const stockItems = await prisma.stockItem.findMany({
      where: {
        OR: [
          { daysInStock: { gt: 90 } },
          { margin: { gt: 30 } },
        ],
      },
      orderBy: [
        { daysInStock: "desc" },
        { margin: "desc" },
      ],
      take: 15,
    });

    if (stockItems.length === 0) {
      return NextResponse.json(
        {
          error: "ไม่พบข้อมูลสต๊อกจัดโปรโมชันในระบบ กรุณารันบอทเพื่อดึงข้อมูลสต๊อก Advice ในหน้ารายงานก่อน",
        },
        { status: 400 }
      );
    }

    console.log(`[Generate-Sales-Brief] Found ${stockItems.length} priority stock items for matchmaking.`);

    // =========================================================================
    // 2. AI Prompting (Gemini API Integration)
    // =========================================================================
    const systemInstruction = 
      "คุณคือกุนซือการขายระดับท็อปของร้าน Advice สาขาสามร้อยยอด หน้าที่ของคุณคือการจับคู่อาการเสียของลูกค้า (Service Jobs) กับสินค้าที่ต้องรีบขาย (Stock Items) เพื่อสร้างคำแนะนำการ Upsell ให้พนักงาน ให้ผลลัพธ์เป็นภาษาไทยที่อ่านง่าย สนุก และใช้หน้างานได้จริง";

    const userPrompt = `
คุณเป็นกุนซือการขายที่ต้องจัดคู่รายการเสนอขายสินค้า (Upsell/Cross-sell) โดยใช้ตรรกะแบบชาญฉลาด
จงสร้างแผนการเสนอขายสินค้าหน้าร้านให้กับทีมช่างเทคนิคและแคชเชียร์ จากข้อมูลรายการงานซ่อมและคลังสินค้าที่กำหนดให้ดังต่อไปนี้:

[ข้อมูลงานซ่อมลูกค้าค้างวิเคราะห์ (Customer Pain Points)]
${JSON.stringify(
  painPoints.map((p) => ({
    id: p.id,
    rawText: p.rawText,
    relatedProductOrService: p.relatedProductOrService,
    urgencyLevel: p.urgencyLevel,
    corePainPoint: p.analysis?.corePainPoint || "",
    realCustomerNeed: p.analysis?.realCustomerNeed || "",
  })),
  null,
  2
)}

[ข้อมูลสินค้าที่ควรระบาย/กำไรดีในสต๊อก (Stock Items)]
${JSON.stringify(
  stockItems.map((s) => ({
    productCode: s.productCode,
    productName: s.productName,
    category: s.category,
    brand: s.brand,
    price: s.price,
    daysInStock: s.daysInStock,
    margin: s.margin,
  })),
  null,
  2
)}

คำแนะนำในการวิเคราะห์จับคู่:
1. จับคู่อุปกรณ์หรืออาการเสียของลูกค้าในรายการซ่อม เข้ากับสินค้าแนะนำในคลังสินค้าที่มีความเกี่ยวเนื่องสัมพันธ์กัน เช่น:
   - ปัญหาเกี่ยวกับเครื่องช้า/ฮาร์ดดิสก์เสีย -> แนะนำ SSD
   - ปัญหาจอพัง/เครื่องหล่น -> แนะนำ ฟิล์มกันรอย หรือ ซองกระเป๋า หรือ น้ำยาเช็ดจอ
   - ปัญหาแรมไม่พอ -> แนะนำ RAM หรือ เมมโมรี่การ์ด
   - รายการซ่อมทั่วไป -> เสนอขายสินค้าระบายคลังที่มี Margin สูง เช่น Accessories แบรนด์ยี่ห้อต่าง ๆ ที่ค้างนาน
2. พยายามจับคู่อย่างน้อย 1 ชิ้นเสนอขายต่อ 1 เคสงานซ่อม โดยเสนอจุดขายที่ดูจริงใจ ไม่ยัดเยียด แต่มีประโยชน์ต่อตัวลูกค้า
3. โทนเสียงเป็นภาษาไทยที่เป็นมิตร สนุกสนาน คมคาย และใช้งานหน้าร้านได้จริง

คุณต้องตอบกลับผลลัพธ์ในรูปแบบ JSON ด้วยโครงสร้างรูปแบบนี้เท่านั้น (ห้ามใส่คำเกริ่นนำ หรือครอบโค้ดด้วย markdown code blocks ใดๆ):
{
  "technicianBrief": [
    {
      "painPointId": "ไอดีของ CustomerPainPoint เพื่อใช้อ้างอิงเชื่อมโยง",
      "customerName": "ชื่อของลูกค้า (วิเคราะห์สกัดจาก rawText หรือระบุเป็น 'ลูกค้าทั่วไป' หรือ 'ลูกค้าซ่อม')",
      "device": "ชื่อรุ่นหรือยี่ห้ออุปกรณ์ (เช่น โน้ตบุ๊ก ASUS, พีซีประกอบ)",
      "symptom": "อาการเสียสั้นๆ",
      "suggestedProductCode": "รหัสสินค้าแนะนำในคลัง (productCode)",
      "suggestedProductName": "ชื่อสินค้าแนะนำ (productName)",
      "upsellScript": "บทพูดสั้นๆ สำหรับช่างในการเสนอขายสินค้าเพิ่มเพื่อความคุ้มค่าของลูกค้า"
    }
  ],
  "cashierTrap": [
    {
      "painPointId": "ไอดีของ CustomerPainPoint เพื่อใช้อ้างอิงเชื่อมโยง",
      "customerName": "ชื่อของลูกค้า",
      "device": "อุปกรณ์",
      "suggestedProductCode": "รหัสสินค้าแนะนำในคลัง (productCode)",
      "suggestedProductName": "ชื่อสินค้าแนะนำ (productName)",
      "actionScript": "คำแนะนำแบบจับวางหน้าร้านสำหรับแคชเชียร์ เมื่อลูกค้าคนนี้มารับเครื่อง เช่น ให้หยิบสินค้าตัวนี้มารอเสนอขายลดราคาพิเศษทันที"
    }
  ]
}
`;

    const fullPrompt = `${systemInstruction}\n\n${userPrompt}`;

    console.log("[Generate-Sales-Brief] Calling Gemini API...");
    const geminiResult = await generateJSON<BriefGeneratorResult>(fullPrompt);

    // Defensive structure validation
    if (!geminiResult.technicianBrief || !Array.isArray(geminiResult.technicianBrief) ||
        !geminiResult.cashierTrap || !Array.isArray(geminiResult.cashierTrap)) {
      throw new Error("โครงสร้างข้อมูล JSON ที่ตอบกลับมาจาก Gemini AI ไม่ถูกต้อง");
    }

    // =========================================================================
    // 3. Caching & Database Transaction Save
    // =========================================================================
    console.log("[Generate-Sales-Brief] Saving generated sales brief to Database...");
    
    const painPointIds = painPoints.map((p) => p.id);
    const formattedMarkdown = formatMarkdownBrief(geminiResult);

    const savedBrief = await prisma.$transaction(async (tx) => {
      // Create new DailyBrief record
      const brief = await tx.dailyBrief.create({
        data: {
          briefDate: new Date(),
          summary: formattedMarkdown, // Store formatted markdown for UI rendering
          customerInsight: JSON.stringify(geminiResult), // Cache raw JSON for client parsing
          painPointIds: JSON.stringify(painPointIds),
          externalSignalIds: JSON.stringify([]),
          status: "final",
        },
      });

      // Update matched pain points status to 'analyzed' to exclude from future brief builds
      await tx.customerPainPoint.updateMany({
        where: {
          id: { in: painPointIds },
        },
        data: {
          status: "analyzed",
        },
      });

      return brief;
    });

    console.log(`[Generate-Sales-Brief] Successfully created DailyBrief with ID: ${savedBrief.id}`);

    return NextResponse.json({
      success: true,
      dailyBrief: {
        id: savedBrief.id,
        briefDate: savedBrief.briefDate,
        summary: savedBrief.summary,
        rawBrief: geminiResult,
      },
    }, { status: 201 });

  } catch (error: any) {
    console.error("[Generate-Sales-Brief] Error in API Route:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "เกิดข้อผิดพลาดในการคำนวณจับคู่หรือประมวลผลระบบ AI Matchmaking",
      },
      { status: 500 }
    );
  }
}
