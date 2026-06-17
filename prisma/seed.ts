import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const adapter = new PrismaBetterSqlite3({ 
  url: 'file:./prisma/dev.db' 
});
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Starting seed...');

  // Clear existing data to avoid duplicates
  await prisma.clipIdea.deleteMany({});
  await prisma.dailyBrief.deleteMany({});
  await prisma.painPointAnalysis.deleteMany({});
  await prisma.customerPainPoint.deleteMany({});
  await prisma.externalSignalAnalysis.deleteMany({});
  await prisma.externalSignal.deleteMany({});
  await prisma.storyFormat.deleteMany({});

  // 1. Seed Story Formats
  const formats = [
    {
      name: 'Customer Says vs Reality',
      structure: 'เริ่มจากความคิดเห็นทั่วไปของลูกค้าที่มักจะเข้าใจผิด (Customer Says) แล้วหักมุมด้วยความจริงทางการช่างหรือข้อมูลที่ถูกต้อง (Reality)',
      exampleHook: "ลูกค้าชอบบอกว่า 'คอมช้าต้องกด F5 บ่อยๆ' แต่จริงๆ แล้วมันช่วยจริงไหม?",
      recommendedShotStyle: 'ช่างหน้าร้านทำท่ากดคีย์บอร์ด แล้วหันมาโบกมือปฏิเสธ ก่อนตัดไปที่กราฟแสดงการทำงานของเครื่องจริง',
    },
    {
      name: 'POV',
      structure: 'จัดกล้องมุมมองบุคคลที่หนึ่งแทนสายตาพนักงานหน้าร้านหรือช่างซ่อม เสมือนลูกค้าได้เข้ามาเจอปัญหาด้วยตนเอง',
      exampleHook: "POV: เมื่อลูกค้าเดินเข้ามาบอกว่า 'เพิ่งล้างเครื่องเมื่อวาน ทำไมวันนี้ช้าอีกแล้ว'",
      recommendedShotStyle: 'ใช้มือถือถ่ายมุมมองแทนสายตาจากเคาน์เตอร์ เห็นกล่องคอมพิวเตอร์และมือช่างที่ชี้จุดปัญหา',
    },
    {
      name: '3 Common Causes',
      structure: 'ให้ข้อมูลอย่างเป็นระบบเกี่ยวกับ 3 สาเหตุหลักที่ทำให้เกิดปัญหา เพื่อแสดงความเชี่ยวชาญและช่วยคัดกรองปัญหาก่อนซ่อม',
      exampleHook: 'คอมเปิดติดแต่ไฟไม่ขึ้น? นี่คือ 3 สาเหตุยอดฮิตที่ช่างเจอบ่อยที่สุด!',
      recommendedShotStyle: 'ช่างหน้าร้านพูดกระชับ ชูนิ้วบอก 1-2-3 สลับกับรูปภาพบอร์ดและสายไฟในเคสคอม',
    },
    {
      name: 'Before / After',
      structure: 'แสดงสภาพความเสียหายหรือฝุ่นสะสมของเครื่องก่อนได้รับการจัดการ (Before) เทียบกับผลลัพธ์ที่เงาและทำงานลื่นหลังแก้ไข (After)',
      exampleHook: 'โน้ตบุ๊กร้อนจนดับ ดับแล้วดับอีก... มาดูสภาพข้างในและการเปลี่ยนแปลงหลังทำความสะอาดกัน!',
      recommendedShotStyle: 'ซูมกล้องใกล้ๆ เห็นฝุ่นหนาเตอะ (Before) แล้วตัดฉากเปลี่ยนเป็นพัดลมหมุนเงียบกริบไร้ฝุ่น (After) โดยใช้ transition แบบสไลด์เร็ว',
    },
    {
      name: 'Real Repair Case',
      structure: 'พาเดินทัวร์เคสซ่อมจริงในแต่ละวัน เล่าเรื่องย่อ ปัญหา หน้างานช่าง และการแก้ปัญหาจนจบเคส',
      exampleHook: 'เคสซ่อมวันนี้: ลูกค้าเผลอทำน้ำอัดลมหกใส่คีย์บอร์ด! ช่างทำยังไงมาดูกัน',
      recommendedShotStyle: 'ถ่ายเห็นบรรยากาศหน้าร้านจริง ช่างเริ่มแกะเครื่องชี้คราบน้ำ สเปรย์บอร์ดล้าง และเครื่องกลับมาเปิดติด',
    },
    {
      name: 'Myth Busting',
      structure: 'ลบล้างความเชื่อไอทีแบบผิดๆ ที่เป็นอันตรายต่อคอมพิวเตอร์หรือทำให้เสียเงินฟรี',
      exampleHook: 'อย่าหาทำ! เอาไดร์เป่าผมร้อนๆ เป่าโน้ตบุ๊กตอนน้ำหกใส่... พังแน่เพราะสาเหตุนี้',
      recommendedShotStyle: 'หยิบไดร์เป่าผมมาทำท่าเป่า แล้วทำสัญลักษณ์กากบาทสีแดงบนจอ สลับกับภาพพลาสติกคีย์บอร์ดละลาย',
    },
    {
      name: 'Quick Checklist',
      structure: 'เช็คลิสต์ตรวจสอบด่วน 4-5 ข้อที่พนักงานและลูกค้าสามารถกดเช็คได้ด้วยตัวเองเพื่อแก้ปัญหาเบื้องต้น',
      exampleHook: 'ก่อนเสียตังค์ยกคอมมาซ่อม! เช็คด่วน 4 จุดนี้ก่อนว่าสายแน่นไหม',
      recommendedShotStyle: 'ถือกระดาษเช็คลิสต์หรือเคาะหน้าจอ ตรวจตามขั้วสายไฟ สายจอ และสวิตช์หลังเคสทีละจุด',
    },
    {
      name: 'Budget Option vs Better Option',
      structure: 'แนะนำทางเลือกสายประหยัดเน้นแก้ขัด (Budget) เทียบกับทางเลือกที่ดีกว่าในระยะยาวคุ้มราคา (Better) เพื่อช่วยการขาย',
      exampleHook: 'โน้ตบุ๊กอืดมาก! อัปเดต SSD ตัวประหยัด หรือถอยเครื่องใหม่ไปเลย แบบไหนคุ้มกว่า?',
      recommendedShotStyle: 'วาง SSD คู่กับโน้ตบุ๊กใหม่ ชี้มือไปทางซ้าย (ตัวเลือกถูก) และขวา (ตัวเลือกดีกว่า) สรุปความต่างชัดๆ',
    },
    {
      name: 'Problem → Cause → Solution',
      structure: 'สรุปปัญหาที่พบบ่อย ค้นหาสาเหตุที่แท้จริง และนำเสนอวิธีการแก้ไขที่เป็นรูปธรรมและเข้าใจง่าย',
      exampleHook: 'หน้าจอฟ้าบ่อยๆ รหัสนี้แปลว่าอะไร? และแก้ง่ายๆ ได้ยังไง',
      recommendedShotStyle: 'ถ่ายเห็นจอบอร์ดสีฟ้า จากนั้นช่างอธิบายความหมาย และเริ่มถอดแรมออกมาขัดถูทำความสะอาดจนหายดี',
    },
  ];

  for (const f of formats) {
    await prisma.storyFormat.create({
      data: f,
    });
  }
  console.log(`Seeded ${formats.length} Story Formats.`);

  // 2. Seed Customer Pain Points
  const painPoints = [
    {
      rawText: 'ลูกค้ายกคอมเปิดไม่ติดมา 3 คน บางเครื่องพัดลมหมุนแป๊บเดียวแล้วดับ บางเครื่องนิ่งสนิทเลย',
      countSeen: 3,
      relatedProductOrService: 'บริการตรวจเช็คและซ่อมคอมพิวเตอร์ / พาวเวอร์ซัพพลาย (Power Supply)',
      customerType: 'ผู้ใช้งานทั่วไป / พนักงานออฟฟิศ',
      urgencyLevel: 'high',
      category: 'repair_issue',
      status: 'pending',
    },
    {
      rawText: 'ลูกค้าถามหาโน้ตบุ๊กให้ลูกเรียนออนไลน์และพิมพ์รายงาน งบไม่เกิน 15,000 บาท อยากได้เครื่องลื่นๆ ลำโพงเสียงดังและทนทาน',
      countSeen: 2,
      relatedProductOrService: 'โน้ตบุ๊กราคาประหยัด (Notebook / Laptop)',
      customerType: 'ผู้ปกครอง / นักเรียน / นักศึกษา',
      urgencyLevel: 'medium',
      category: 'buying_question',
      status: 'pending',
    },
    {
      rawText: 'ลูกค้าบ่นเน็ตบ้านช้า สัญญาณหลุดบ่อย โหลดภาพไม่ขึ้น ทั้งที่เพิ่งเปลี่ยนแพ็กเกจเน็ตความเร็วสูงมา',
      countSeen: 1,
      relatedProductOrService: 'เราเตอร์ประสิทธิภาพสูง / Access Point / สาย LAN Cat6',
      customerType: 'ผู้ใช้งานทั่วไป / พนักงาน Work From Home',
      urgencyLevel: 'medium',
      category: 'performance_problem',
      status: 'pending',
    },
    {
      rawText: 'ลูกค้าถามว่าอยากซื้อโน้ตบุ๊กไปเรียนตัดต่อวิดีโอทำคอนเทนต์ RAM 8GB ในตัวเครื่องพอใช้ไหม หรือต้องเป็น RAM 16GB ถึงจะตัดลื่น',
      countSeen: 1,
      relatedProductOrService: 'โน้ตบุ๊กสำหรับครีเอเตอร์ / บริการอัปเกรด RAM',
      customerType: 'นักศึกษา / ครีเอเตอร์มือใหม่',
      urgencyLevel: 'low',
      category: 'buying_question',
      status: 'pending',
    },
    {
      rawText: 'ลูกค้าเอาโน้ตบุ๊กมาซ่อม หน้าจอเป็นเส้นแนวตั้งสีชมพูกับสีเขียว เพิ่งเป็นหลังจากเครื่องตกโต๊ะเบาๆ',
      countSeen: 1,
      relatedProductOrService: 'อะไหล่หน้าจอโน้ตบุ๊ก / บริการซ่อมเปลี่ยนจอโน้ตบุ๊ก',
      customerType: 'ผู้ใช้งานทั่วไป',
      urgencyLevel: 'high',
      category: 'repair_issue',
      status: 'pending',
    },
  ];

  for (const p of painPoints) {
    await prisma.customerPainPoint.create({
      data: p,
    });
  }
  console.log(`Seeded ${painPoints.length} Customer Pain Points.`);

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
