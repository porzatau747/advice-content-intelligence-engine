import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateJSON } from "@/lib/gemini";

interface MatchItem {
  signalId: string;
  isHighlyRelevant: boolean;
  reason: string;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { painPointIds } = body as { painPointIds: string[] };

    if (!painPointIds || !Array.isArray(painPointIds) || painPointIds.length === 0) {
      return NextResponse.json([]);
    }

    // 1. Fetch selected pain points and analyses
    const painPoints = await prisma.customerPainPoint.findMany({
      where: { id: { in: painPointIds } },
      include: { analysis: true },
    });

    if (painPoints.length === 0) {
      return NextResponse.json([]);
    }

    // 2. Fetch all saved external signals with analyses
    const signals = await prisma.externalSignal.findMany({
      include: { analysis: true },
    });

    if (signals.length === 0) {
      return NextResponse.json([]);
    }

    // 3. Formulate the prompt for Gemini Flash 2.5 to perform strict semantic matching
    const prompt = `
คุณเป็นนักวิเคราะห์ระบบเปรียบเทียบข้อมูลไอทีของร้าน "Advice สามร้อยยอด"
หน้าที่ของคุณคือประเมิน "สัญญาณเทรนด์ภายนอก (External Signals)" กับ "ปัญหาของลูกค้าหน้าร้าน (Customer Pain Points)" ว่ามีความสอดคล้องกันเชิงเทคนิคและบริบทอย่างแท้จริงเพื่อนำมาผลิตคลิปวิดีโอหรือไม่

[รายการปัญหาหน้าร้านที่ลูกค้าเลือกใช้เป็นหลัก]
${painPoints
  .map(
    (p, idx) => `
${idx + 1}. [ID: ${p.id}]
   - ปัญหาดิบหน้าร้าน: "${p.rawText}"
   - สรุปปัญหาเชิงลึก: "${p.analysis?.corePainPoint ?? ""}"
   - โอกาสทางสินค้า/บริการ: "${p.analysis?.productServiceOpportunity ?? ""}"
   - หมวดหมู่: "${p.category ?? ""}"
`
  )
  .join("\n")}

[รายการสัญญาณเทรนด์ภายนอกทั้งหมดที่ระบบมีอยู่]
${signals
  .map(
    (s, idx) => `
${idx + 1}. [ID: ${s.id}]
   - หัวข้อเทรนด์: "${s.title}"
   - รายละเอียด: "${s.summary ?? ""}"
   - สรุปคำแนะนำไอทีเดิม: "${s.analysis?.signalSummary ?? ""}"
   - แนะนำมุมคอนเทนต์: "${s.analysis?.suggestedContentAngle ?? ""}"
`
  )
  .join("\n")}

คำสั่งวิเคราะห์จับคู่:
1. วิเคราะห์และตรวจสอบว่าสัญญาณเทรนด์ภายนอกแต่ละรายการ สอดคล้องและเป็นไปในทิศทางเดียวกับปัญหาหน้าร้านอย่างตรงไปตรงมาทางเทคนิคและบริบทหรือไม่ โดยระบุค่า isHighlyRelevant เป็น true หรือ false เท่านั้น:
   - true: สอดคล้องโดยตรง เช่น ปัญหาลูกค้ามองหาเมาส์ราคาประหยัด และเทรนด์แนะนำอุปกรณ์ไอทีราคาย่อมเยา หรือ ปัญหาเครื่องช้าต้องการอัพเกรด RAM และเทรนด์แนะนำความแตกต่างหลังอัพเกรด RAM
   - false: ไม่มีความเกี่ยวข้องใดๆ หรือขัดแย้งเชิงเทคนิคและบริบทกับปัญหาจริงหน้าร้านอย่างชัดเจน (เช่น ปัญหาจอเป็นเส้นจากการทำตก/เสียหายทางฮาร์ดแวร์ แต่เทรนด์แนะนำให้ลงโปรแกรมแก้ไข หรือ ปัญหาเครื่องดับจากความร้อนฝุ่นเกาะ แต่เทรนด์แนะนำให้กดปุ่มลัดรีเซ็ตซอฟต์แวร์)
2. ระบุเหตุผล (reason) สั้นๆ เป็นภาษาไทยไม่เกิน 15 คำ เฉพาะกรณีที่เป็น true หากเป็น false ให้ระบุเหตุผลสั้นๆ ว่าทำไมไม่เกี่ยวข้องหรือขัดแย้ง

ตอบกลับในรูปแบบ JSON ภาษาไทยที่มีโครงสร้างเป็น Array ของ Object ดังนี้เท่านั้น (ห้ามมีตัวอักษรเกริ่นนำหรือสรุป หรือสัญลักษณ์ครอบใดๆ):
[
  {
    "signalId": "ID ของสัญญาณภายนอก",
    "isHighlyRelevant": true หรือ false,
    "reason": "เหตุผลสั้นๆ เช่น 'เกี่ยวกับอัปเดต RAM เหมือนกัน' หรือ 'ไม่สอดคล้องเนื่องจากเป็นจอแตกทางฮาร์ดแวร์'"
  }
]
`;

    // 4. Call Gemini
    const matches = await generateJSON<MatchItem[]>(prompt);
    
    // Safety check and filtering valid signal IDs
    const validSignalIds = new Set(signals.map(s => s.id));
    const filteredMatches = matches.filter(m => 
      m && 
      m.signalId && 
      validSignalIds.has(m.signalId)
    );

    return NextResponse.json(filteredMatches);
  } catch (error: any) {
    console.error("Semantic matching API error:", error);
    // Return empty array on error to keep UI operational
    return NextResponse.json([], { status: 500 });
  }
}
