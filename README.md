# Advice Content Intelligence Engine

ระบบจัดการและสร้างสคริปต์สั้นประจำวัน (Facebook Reels / YouTube Shorts) สำหรับร้าน **Advice สามร้อยยอด** จากปัญหาดิบที่ลูกค้าสอบถามหน้าเคาน์เตอร์ ร่วมกับ สัญญาณเทรนด์ไอทีภายนอก (YouTube Data API v3 & Google Trends)

---

## ฟีเจอร์หลัก (Core Features)

1. **Customer Pain-Point Engine:** บันทึกปัญหาจริงจากแผนกขายและแผนกซ่อมหน้าร้าน ดำเนินการวิเคราะห์ระดับความเร่งด่วน ประเภทรวมถึงสภาวะทางจิตวิทยา (Hidden Fear, Real Customer Need) โดยใช้ Gemini Flash 2.5
2. **External Signal Engine:** ดึงข้อมูลเทรนด์เทคโนโลยีแบบเรียลไทม์จาก YouTube Data API v3 (ค้นหาวิดีโอสั้น) และ Google Trends Daily RSS Feed
3. **Story Format Library:** คลังฟอร์แมตโครงสร้างวิดีโอสำเร็จรูปที่เหมาะสำหรับพนักงานคนเดียวถ่ายในร้าน (เช่น Before/After, POV, 3 Common Causes)
4. **Daily Brief Generator:** ผสมผสานปัญหาหน้าร้าน กระแสไอทีภายนอก และสไตล์การเล่าเรื่องเพื่อสร้างบรีฟสคริปต์วิดีโอ 3 ประเภทหลักประจำวัน (Educate, Sell, Repair)
5. **Markdown Export:** คัดลอกสคริปต์ทั้งหมดเป็นรูปแบบข้อความหรือ Markdown ไปใช้งานในการถ่ายทำและแก้ไขผ่านมือถือ (CapCut) ได้ทันที

---

## 🛠️ โครงสร้างเทคโนโลยี (Tech Stack)

- **Framework:** Next.js 15 (App Router) + TypeScript
- **Database & ORM:** SQLite + Prisma ORM 7 (พร้อม Driver Adapter)
- **Styling:** Tailwind CSS v4
- **LLM Engine:** Google Generative AI (`gemini-2.5-flash`)
- **APIs:** YouTube Data API v3 + Google Trends RSS Parser

---

## ⚙️ ขั้นตอนการติดตั้งและเริ่มต้นใช้งาน (Installation)

### 1. โคลนและลงแพ็กเกจ
```bash
npm install
```

### 2. ตั้งค่าไฟล์ Environment Variables
สร้างไฟล์ `.env.local` ใน Root Directory และกรอกค่าดังนี้:
```bash
# คัดลอกค่าจาก .env.example มาสร้างเป็น .env.local
DATABASE_URL="file:./prisma/dev.db"
GEMINI_API_KEY="กรอก_API_Key_ของคุณที่นี่"
YOUTUBE_API_KEY="กรอก_API_Key_ของคุณที่นี่"
```

#### วิธีขอ API Keys (ฟรี):
1. **Gemini API Key:** 
   - ไปที่ [Google AI Studio](https://aistudio.google.com/)
   - ล็อกอินด้วยบัญชี Gmail แล้วกด **Create API Key**
2. **YouTube Data API v3 Key:**
   - ไปที่ [Google Cloud Console](https://console.cloud.google.com/)
   - สร้างโปรเจกต์ใหม่และเปิดใช้งาน (Enable) บริการชื่อ **YouTube Data API v3**
   - ไปที่แท็บ **Credentials** แล้วสร้าง **API Key**

### 3. ตั้งค่าระบบฐานข้อมูลและสร้างข้อมูลเริ่มต้น (Database Sync & Seed)
รันคำสั่งเหล่านี้เพื่อสร้างและนำเข้าข้อมูลตั้งต้น (5 ปัญหาตัวอย่าง และ 9 ฟอร์แมตวิดีโอ) ลงในฐานข้อมูล SQLite:
```bash
# ซิงค์ schema ไปยัง SQLite database
npx prisma db push

# คอมไพล์และสร้าง Prisma client ลงในโปรเจกต์
npx prisma generate

# นำเข้าข้อมูลเริ่มต้น (Seeding)
npx prisma db seed
```

### 4. รันระบบสำหรับการพัฒนา (Run Development)
```bash
npm run dev
```
ระบบจะเปิดใช้งานที่ [http://localhost:3000](http://localhost:3000)

---

## 📂 โครงสร้างโฟลเดอร์สำคัญ
- `prisma/schema.prisma` - โครงสร้างฐานข้อมูล SQLite
- `prisma/seed.ts` - สคริปต์สร้างข้อมูลเริ่มต้นในฐานข้อมูล
- `src/app/api/` - API endpoints ทั้งหมด (Pain-points, Trends, Brief generator)
- `src/lib/gemini.ts` - ตัวควบคุมการสื่อสารกับโมเดล Gemini Flash 2.5
- `src/lib/youtube.ts` - ตัวเชื่อมต่อ YouTube API
- `src/lib/prompts.ts` - Prompt Templates ภาษาไทยที่ควบคุมผลลัพธ์ของ AI

---

## 📜 กฎเหล็กและการเขียนสคริปต์ไอที
- โพสต์และบทพูดทั้งหมดจะส่งผลลัพธ์เป็น **ภาษาไทย 100%** โทนธรรมชาติ (จริงว่ะ)
- หากมีบทพูดเกี่ยวกับ ราคา, สเปคเฉพาะทาง, หรือการรับประกันสินค้า ระบบจะติดธง `[ต้องตรวจสอบข้อมูลและสต๊อกจริงก่อนถ่ายทำ]` เพื่อความปลอดภัยด้านข้อมูลหน้าร้าน
