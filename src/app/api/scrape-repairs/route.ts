import { NextResponse } from "next/server";
import { generateJSON } from "@/lib/gemini";
import { prompts } from "@/lib/prompts";

interface ParseResult {
  rawText: string;
  deviceName: string;
  symptoms: string;
  relatedProductOrService: string;
  customerType: string;
  urgencyLevel: "low" | "medium" | "high";
  category: "repair_issue";
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url, rawContent } = body;

    // 1. If rawContent (pasted text or HTML) is directly provided
    if (rawContent && typeof rawContent === "string" && rawContent.trim()) {
      const prompt = prompts.parseScrapedRepairData(rawContent);
      const parsedData = await generateJSON<ParseResult>(prompt);
      return NextResponse.json({ success: true, data: parsedData });
    }

    // 2. If a URL is provided, try to fetch it
    if (url && typeof url === "string" && url.trim()) {
      const lowerUrl = url.toLowerCase();

      // Check if it's a restricted internal branch domain
      if (lowerUrl.includes("nescen.in.th") || lowerUrl.includes("branch.") || lowerUrl.includes("localhost") || lowerUrl.includes("192.168.")) {
        return NextResponse.json(
          {
            success: false,
            error: "ระบบ NESCEN/Advice สาขา เป็นระบบที่ต้องล็อกอินเข้าใช้งานและจำกัดการเข้าถึงจากเครื่องเฉพาะของหน้าร้าน เซิร์ฟเวอร์ไม่สามารถเข้าถึงหน้าลิงก์นี้โดยตรงได้\n\nกรุณาเลือกใช้วิธี [วางโค้ด HTML หรือข้อความ] แทน โดยเปิดหน้างานซ่อมนี้ในเบราว์เซอร์ของคุณ กด Ctrl+A (เลือกทั้งหมด) -> Ctrl+C (คัดลอก) แล้วนำมาวางในช่องรับข้อมูลได้ทันที",
          },
          { status: 400 }
        );
      }

      try {
        const fetchResponse = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
          next: { revalidate: 0 },
        });

        if (!fetchResponse.ok) {
          throw new Error(`HTTP Error ${fetchResponse.status}`);
        }

        const htmlContent = await fetchResponse.text();
        
        // Pass the fetched HTML to Gemini
        const prompt = prompts.parseScrapedRepairData(htmlContent);
        const parsedData = await generateJSON<ParseResult>(prompt);
        return NextResponse.json({ success: true, data: parsedData });

      } catch (fetchError: any) {
        console.error("Failed to fetch URL:", fetchError);
        return NextResponse.json(
          {
            success: false,
            error: `ไม่สามารถดึงข้อมูลจากลิงก์เว็บได้โดยตรง (${fetchError.message || "Network Error"})\n\nคำแนะนำ: เว็บปลายทางอาจมีการป้องกันบ็อตหรือต้องล็อกอินก่อนเข้าใช้งาน กรุณาใช้แถบ [วางโค้ด HTML หรือข้อความ] เพื่อวางข้อมูลแทน`,
          },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { success: false, error: "กรุณาระบุ ลิงก์เว็บ หรือ วางโค้ด HTML/ข้อความ เพื่อนำเข้าข้อมูล" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Scrape repairs API error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "เกิดข้อผิดพลาดในการวิเคราะห์ข้อมูลซ่อมคอมพิวเตอร์" },
      { status: 500 }
    );
  }
}
