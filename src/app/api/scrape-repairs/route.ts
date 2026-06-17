import { NextResponse } from "next/server";
import { generateJSON } from "@/lib/gemini";
import { prompts } from "@/lib/prompts";
import { loginToNescen, fetchRepairTickets, fetchTicketHistory } from "@/lib/nescen-scraper";
import { prisma } from "@/lib/db";

interface ParseResult {
  rawText: string;
  deviceName: string;
  symptoms: string;
  relatedProductOrService: string;
  customerType: string;
  urgencyLevel: "low" | "medium" | "high";
  category: "repair_issue";
}

function getDates(daysAgo = 14) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - daysAgo);
  const format = (d: Date) => {
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };
  return { startDate: format(start), endDate: format(end) };
}

function buildCombinedInfo(workDtlId: string, cusname: string, detail: any): string {
  const customer = detail.tab1?.customer_detail?.cus_name || cusname || "ลูกค้า";
  const device = `${detail.tab1?.product_detail?.band || ""} ${detail.tab1?.product_detail?.model || ""}`.trim() || "คอมพิวเตอร์/อุปกรณ์";
  const productType = detail.tab1?.product_detail?.product_type || "";
  const symptom = detail.tab1?.product_detail?.symptom || "ไม่ระบุอาการ";
  const estimates = detail.tab2?.work_detail?.technician_mechanism_estimate || [];
  const diagnosis = estimates.map((e: any) => `${e.job_estimate_name || ""} (${e.job_mechanism_name || ""})`).join(", ");
  const transfers = detail.tab2?.service_tranfer || [];
  const parts = transfers.map((p: any) => p.shortname?.trim()).filter(Boolean).join(", ");
  return `[ระบบงานซ่อม NESCEN ของร้าน]
รหัสอ้างอิง: ${workDtlId}
ชื่อลูกค้า: ${customer}
อุปกรณ์: ${device} (ประเภทสินค้า: ${productType})
อาการแจ้งเสียของลูกค้า: ${symptom}
ผลการตรวจวิเคราะห์ของช่าง: ${diagnosis || "อยู่ระหว่างตรวจเช็ค"}
อะไหล่ที่เปลี่ยน/เสนอราคา: ${parts || "ไม่มีการเปลี่ยนอะไหล่/ไม่ระบุ"}
ยอดรวมบริการและอะไหล่: ${detail.tab1?.netpay?.net_pay || "0.00"} บาท
`;
}

// GET /api/scrape-repairs
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const defaultDates = getDates(14);
    const startDate = searchParams.get("startDate") || defaultDates.startDate;
    const endDate = searchParams.get("endDate") || defaultDates.endDate;
    const session = await loginToNescen();
    const tickets = await fetchRepairTickets(session, startDate, endDate);
    const sortedTickets = tickets.sort((a: any, b: any) =>
      new Date(b.register_time).getTime() - new Date(a.register_time).getTime()
    );
    const importedRecords = await prisma.customerPainPoint.findMany({
      select: { nescenTicketId: true },
      where: { nescenTicketId: { not: null } },
    });
    const importedIds = new Set(importedRecords.map((r: any) => r.nescenTicketId));
    const ticketsWithStatus = sortedTickets.map((t: any) => ({ ...t, imported: importedIds.has(t.work_dtl_id) }));
    return NextResponse.json({ success: true, tickets: ticketsWithStatus });
  } catch (error: any) {
    console.error("GET scrape-repairs error:", error);
    return NextResponse.json({ success: false, error: error?.message || "ไม่สามารถดึงรายการใบส่งซ่อมจากระบบ NESCEN ได้" }, { status: 500 });
  }
}

// POST /api/scrape-repairs
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, url, rawContent, workDtlId, machineNo, cus8, cusname, tickets: batchTickets } = body;

    // A. Parse pasted HTML/text
    if (action === "parsePasted" || (rawContent && typeof rawContent === "string" && rawContent.trim())) {
      const contentToParse = rawContent || "";
      if (!contentToParse.trim()) {
        return NextResponse.json({ success: false, error: "กรุณาระบุข้อความที่ต้องการนำเข้า" }, { status: 400 });
      }
      const parsedData = await generateJSON<ParseResult>(prompts.parseScrapedRepairData(contentToParse));
      return NextResponse.json({ success: true, data: parsedData });
    }

    // B. Fetch & parse single ticket detail
    if (action === "fetchDetail") {
      if (!workDtlId) {
        return NextResponse.json({ success: false, error: "กรุณาระบุ workDtlId" }, { status: 400 });
      }
      const session = await loginToNescen();
      const detail = await fetchTicketHistory(session, workDtlId, machineNo || "", cus8 || "", cusname || "");
      const combinedInfo = buildCombinedInfo(workDtlId, cusname || "", detail);
      const parsedData = await generateJSON<ParseResult>(prompts.parseScrapedRepairData(combinedInfo));
      return NextResponse.json({ success: true, data: parsedData });
    }

    // C. Batch import: fetch + parse + auto-save all tickets
    if (action === "batchImport") {
      if (!Array.isArray(batchTickets) || batchTickets.length === 0) {
        return NextResponse.json({ success: false, error: "กรุณาระบุรายการใบส่งซ่อมที่ต้องการนำเข้า" }, { status: 400 });
      }
      const session = await loginToNescen();
      const results: { workDtlId: string; status: "imported" | "skipped" | "error"; message?: string }[] = [];
      for (const ticket of batchTickets) {
        const id = ticket.work_dtl_id;
        try {
          const existing = await prisma.customerPainPoint.findFirst({ where: { nescenTicketId: id } });
          if (existing) {
            results.push({ workDtlId: id, status: "skipped", message: "นำเข้าแล้ว" });
            continue;
          }
          const detail = await fetchTicketHistory(session, id, ticket.machine_no || "", ticket.cuscode8 || "", ticket.cusname || "");
          const combinedInfo = buildCombinedInfo(id, ticket.cusname || "", detail);
          const parsedData = await generateJSON<ParseResult>(prompts.parseScrapedRepairData(combinedInfo));
          await prisma.customerPainPoint.create({
            data: {
              rawText: parsedData.rawText,
              countSeen: 1,
              relatedProductOrService: parsedData.relatedProductOrService || null,
              customerType: parsedData.customerType || null,
              urgencyLevel: parsedData.urgencyLevel || "medium",
              nescenTicketId: id,
              status: "pending",
            },
          });
          results.push({ workDtlId: id, status: "imported" });
        } catch (err: any) {
          results.push({ workDtlId: id, status: "error", message: err?.message || "เกิดข้อผิดพลาด" });
        }
      }
      const imported = results.filter(r => r.status === "imported").length;
      const skipped = results.filter(r => r.status === "skipped").length;
      const errors = results.filter(r => r.status === "error").length;
      return NextResponse.json({ success: true, results, summary: { imported, skipped, errors } });
    }

    // D. Legacy URL fetching
    if (url && typeof url === "string" && url.trim()) {
      const lowerUrl = url.toLowerCase();
      if (lowerUrl.includes("nescen.in.th") || lowerUrl.includes("branch.") || lowerUrl.includes("localhost") || lowerUrl.includes("192.168.")) {
        return NextResponse.json({
          success: false,
          error: "ระบบ NESCEN/Advice เป็นระบบที่จำกัดการเข้าใช้งาน หากต้องการนำเข้ารายการใบส่งซ่อม แนะนำให้ใช้ตัวเลือก [รายการงานซ่อมในร้าน] เพื่อกดนำเข้าเคสได้ทันทีเพียงคลิกเดียว หรือคัดลอก HTML/ข้อความมาวางที่แท็บ [วางโค้ด HTML หรือข้อความ]",
        }, { status: 400 });
      }
      try {
        const fetchResponse = await fetch(url, {
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" },
        });
        if (!fetchResponse.ok) throw new Error(`HTTP Error ${fetchResponse.status}`);
        const htmlContent = await fetchResponse.text();
        const parsedData = await generateJSON<ParseResult>(prompts.parseScrapedRepairData(htmlContent));
        return NextResponse.json({ success: true, data: parsedData });
      } catch (fetchError: any) {
        return NextResponse.json({
          success: false,
          error: `ไม่สามารถดึงข้อมูลจากลิงก์เว็บได้โดยตรง (${fetchError.message || "Network Error"})\n\nคำแนะนำ: เว็บไซต์ปลายทางอาจป้องกันบ็อต กรุณาใช้วิธีนำเข้าผ่านรายการ หรือวางโค้ดข้อความแทน`,
        }, { status: 400 });
      }
    }

    return NextResponse.json({ success: false, error: "กรุณาระบุการกระทำหรือป้อนข้อมูลที่ต้องการวิเคราะห์" }, { status: 400 });
  } catch (error: any) {
    console.error("POST scrape-repairs error:", error);
    return NextResponse.json({ success: false, error: error?.message || "เกิดข้อผิดพลาดในการวิเคราะห์ข้อมูลใบส่งซ่อม" }, { status: 500 });
  }
}
