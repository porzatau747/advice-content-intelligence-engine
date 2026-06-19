import { NextResponse } from 'next/server';
import { ingestNescenExcelData } from '@/lib/scrapers/excel-scraper';

export async function GET() {
  try {
    console.log("🚀 เริ่มต้นการทดสอบบอท Excel Scraper...");
    
    // เรียกใช้งานบอทแบบ Asynchronous (อาจใช้เวลา 1-2 นาที ขึ้นอยู่กับความเร็วเว็บ NESCEN)
    const result = await ingestNescenExcelData();
    
    return NextResponse.json({
      message: "Scraping Completed!",
      data: result
    });
  } catch (error: any) {
    console.error("❌ การทดสอบล้มเหลว:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
