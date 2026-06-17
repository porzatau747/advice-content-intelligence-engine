"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Plus, 
  ArrowLeft, 
  MessageSquare,
  Sparkles,
  Info
} from "lucide-react";

export default function AddPainPoint() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    rawText: "",
    countSeen: 1,
    relatedProductOrService: "",
    customerType: "",
    urgencyLevel: "medium",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.rawText.trim()) return;

    try {
      setLoading(true);
      const res = await fetch("/api/pain-points", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        // Redirect to pain points list
        router.push("/pain-points");
      } else {
        const err = await res.json();
        alert(err.error || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
      }
    } catch (error) {
      console.error("Failed to add pain point:", error);
      alert("เกิดข้อผิดพลาดในการเชื่อมต่ออินเทอร์เน็ต");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header breadcrumb */}
      <div className="flex items-center space-x-2">
        <Link 
          href="/" 
          className="text-zinc-500 hover:text-white transition-colors p-2 hover:bg-zinc-800 rounded-xl"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <span className="text-zinc-500 text-sm">/</span>
        <span className="text-zinc-500 text-sm">ปัญหาหน้าร้าน</span>
        <span className="text-zinc-500 text-sm">/</span>
        <span className="text-white text-sm font-semibold">บันทึกใหม่</span>
      </div>

      <div className="space-y-2">
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
          <MessageSquare className="w-5 h-5 text-blue-400" />
          <span>บันทึกปัญหาที่พบบ่อยของลูกค้าประจำวัน</span>
        </h1>
        <p className="text-xs text-zinc-400 font-medium">
          บันทึกคำถามหรือปัญหาจริงที่ลูกค้าเข้ามาถามหน้าร้านในแต่ละวันเพื่อนำมาสร้างสคริปต์สั้น
        </p>
      </div>

      {/* Form Card */}
      <div className="glass-panel p-6 rounded-2xl border border-zinc-800 bg-zinc-900/40">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Raw Text - Required */}
          <div className="space-y-2">
            <label htmlFor="rawText" className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
              วันนี้ลูกค้าถาม/เจอปัญหาเรื่องอะไรเยอะที่สุด? <span className="text-red-500">*</span>
            </label>
            <textarea
              id="rawText"
              rows={4}
              required
              disabled={loading}
              value={form.rawText}
              onChange={(e) => setForm({ ...form, rawText: e.target.value })}
              placeholder="ตัวอย่าง: ลูกค้ายกคอมเปิดไม่ติดมา 3 คนพัดลมหมุนแล้วดับ หรือ ลูกค้ามาถามหาแรม 8GB ไปอัปโน้ตบุ๊กเพื่อเล่นเกมว่าพอไหม..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all"
            />
            <div className="flex items-center space-x-1.5 text-[11px] text-zinc-500 font-medium">
              <Info className="w-3.5 h-3.5" />
              <span>พิมพ์ปัญหาเป็นภาษาพูดตามที่ได้ยินจากลูกค้าหน้าร้านได้เลย ไม่ต้องแต่งประโยคสวยงาม</span>
            </div>
          </div>

          {/* Grid fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Count Seen */}
            <div className="space-y-2">
              <label htmlFor="countSeen" className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
                จำนวนลูกค้าที่เจอเคสนี้ในวันนี้ (ครั้ง)
              </label>
              <input
                id="countSeen"
                type="number"
                min={1}
                disabled={loading}
                value={form.countSeen}
                onChange={(e) => setForm({ ...form, countSeen: parseInt(e.target.value, 10) || 1 })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all"
              />
            </div>

            {/* Urgency Level */}
            <div className="space-y-2">
              <label htmlFor="urgencyLevel" className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
                ความเร่งด่วนของปัญหา
              </label>
              <select
                id="urgencyLevel"
                disabled={loading}
                value={form.urgencyLevel}
                onChange={(e) => setForm({ ...form, urgencyLevel: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all cursor-pointer"
              >
                <option value="low">ต่ำ (มีทางเลี่ยงอื่น / ปัญหาทั่วไป)</option>
                <option value="medium">กลาง (กระทับการใช้งานทั่วไป)</option>
                <option value="high">สูง (คอมพังเปิดไม่ติด / งานซ่อมด่วน)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Related Product */}
            <div className="space-y-2">
              <label htmlFor="relatedProduct" className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
                สินค้าหรือบริการที่เกี่ยวข้อง (ถ้ามี)
              </label>
              <input
                id="relatedProduct"
                type="text"
                disabled={loading}
                value={form.relatedProductOrService}
                onChange={(e) => setForm({ ...form, relatedProductOrService: e.target.value })}
                placeholder="เช่น อัปเกรด RAM, เปลี่ยนหน้าจอ, หูฟังไร้สาย"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all"
              />
            </div>

            {/* Customer Type */}
            <div className="space-y-2">
              <label htmlFor="customerType" className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
                ประเภทลูกค้าหลักที่เจอ
              </label>
              <input
                id="customerType"
                type="text"
                disabled={loading}
                value={form.customerType}
                onChange={(e) => setForm({ ...form, customerType: e.target.value })}
                placeholder="เช่น นักศึกษา, ช่างหน้าร้าน, วัยทำงาน, ผู้ปกครอง"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-zinc-850">
            <Link
              href="/pain-points"
              className="px-5 py-2.5 rounded-xl bg-zinc-850 text-zinc-300 text-sm font-bold hover:bg-zinc-800 hover:text-white border border-transparent active:scale-[0.98] transition-all cursor-pointer"
            >
              ยกเลิก
            </Link>
            <button
              type="submit"
              disabled={loading || !form.rawText.trim()}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] disabled:scale-100 disabled:bg-zinc-850 disabled:text-zinc-600 disabled:border-zinc-800 text-sm font-bold text-white border border-blue-500/20 transition-all duration-200 cursor-pointer shadow-md shadow-blue-600/10"
            >
              <Plus className="w-4 h-4" />
              <span>บันทึกและกลับไปหน้ารวม</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
