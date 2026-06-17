"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft, 
  Sparkles,
  Clipboard,
  Link2,
  FileText,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Plus,
  Info
} from "lucide-react";

interface ParsedData {
  rawText: string;
  deviceName: string;
  symptoms: string;
  relatedProductOrService: string;
  customerType: string;
  urgencyLevel: "low" | "medium" | "high";
  category: string;
}

export default function ImportPainPoint() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"paste" | "url">("paste");
  const [urlInput, setUrlInput] = useState("");
  const [rawContentInput, setRawContentInput] = useState("");
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Form state for previewing and editing the parsed result
  const [parsedResult, setParsedResult] = useState<ParsedData | null>(null);

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setParsedResult(null);

    const payload: { url?: string; rawContent?: string } = {};
    if (activeTab === "url") {
      if (!urlInput.trim()) return;
      payload.url = urlInput.trim();
    } else {
      if (!rawContentInput.trim()) return;
      payload.rawContent = rawContentInput.trim();
    }

    try {
      setParsing(true);
      const res = await fetch("/api/scrape-repairs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setParsedResult(json.data);
      } else {
        setErrorMsg(json.error || "ไม่สามารถวิเคราะห์ข้อมูลใบสั่งซ่อมได้");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setParsing(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parsedResult) return;

    try {
      setSaving(true);
      const res = await fetch("/api/pain-points", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawText: parsedResult.rawText,
          countSeen: 1,
          relatedProductOrService: parsedResult.relatedProductOrService,
          customerType: parsedResult.customerType,
          urgencyLevel: parsedResult.urgencyLevel,
        }),
      });

      if (res.ok) {
        router.push("/pain-points");
      } else {
        const json = await res.json();
        alert(json.error || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
      }
    } catch (err) {
      console.error(err);
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่าย");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center space-x-2">
        <Link 
          href="/pain-points" 
          className="text-zinc-500 hover:text-white transition-colors p-2 hover:bg-zinc-900 rounded-xl"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <span className="text-zinc-500 text-sm">/</span>
        <span className="text-zinc-500 text-sm">ปัญหาหน้าร้าน</span>
        <span className="text-zinc-500 text-sm">/</span>
        <span className="text-white text-sm font-semibold">นำเข้าจากระบบงานซ่อม</span>
      </div>

      <div className="space-y-2">
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
          <Sparkles className="w-5 h-5 text-blue-400" />
          <span>ระบบนำเข้าเคสซ่อมด้วย AI (NESCEN / Advice Scraper)</span>
        </h1>
        <p className="text-xs text-zinc-400 font-medium">
          ดึงข้อมูลอุปกรณ์ที่ลงทะเบียน อาการเสีย และความกังวลของลูกค้าเพื่อมาแปลงเป็นวิดีโอสร้างความเชื่อถือหน้าร้านแบบอัตโนมัติ
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Import Interface */}
        <div className="lg:col-span-6 space-y-4">
          <div className="glass-panel p-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-4">
            {/* Tabs Selector */}
            <div className="flex border-b border-zinc-800 pb-px">
              <button
                onClick={() => { setActiveTab("paste"); setErrorMsg(null); }}
                className={`flex-1 pb-3 text-xs font-bold transition-all border-b-2 flex items-center justify-center space-x-2 cursor-pointer ${
                  activeTab === "paste"
                    ? "border-blue-500 text-white"
                    : "border-transparent text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <Clipboard className="w-4 h-4" />
                <span>วางโค้ด HTML หรือข้อความ (แนะนำ)</span>
              </button>
              <button
                onClick={() => { setActiveTab("url"); setErrorMsg(null); }}
                className={`flex-1 pb-3 text-xs font-bold transition-all border-b-2 flex items-center justify-center space-x-2 cursor-pointer ${
                  activeTab === "url"
                    ? "border-blue-500 text-white"
                    : "border-transparent text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <Link2 className="w-4 h-4" />
                <span>ดึงจากลิงก์เว็บตรง</span>
              </button>
            </div>

            <form onSubmit={handleImport} className="space-y-4 pt-2">
              {activeTab === "paste" ? (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                      วางโค้ด HTML หรือข้อความงานซ่อม
                    </label>
                    <span className="text-[10px] text-zinc-500">รองรับระบบ NESCEN/Advice</span>
                  </div>
                  <textarea
                    rows={8}
                    required
                    disabled={parsing}
                    value={rawContentInput}
                    onChange={(e) => setRawContentInput(e.target.value)}
                    placeholder="เปิดหน้ารายละเอียดใบส่งซ่อม -> กด Ctrl+A (เลือกทั้งหมด) -> Ctrl+C (คัดลอก) แล้วนำข้อความหรือ HTML ทั้งหมดมาวางที่นี่ได้ทันที..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all font-mono"
                  />
                  <div className="flex items-start space-x-2 bg-zinc-950 p-3 rounded-xl border border-zinc-800/80">
                    <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                    <div className="text-[10px] text-zinc-400 leading-normal">
                      <p className="font-bold text-zinc-300">💡 เคล็ดลับความสะดวก 100%:</p>
                      เนื่องจากระบบร้าน **NESCEN** ป้องกันไม่ให้โปรแกรมภายนอกเข้าถึง คุณเพียงแค่คลิกขวาที่รายละเอียดงานซ่อม เลือกทั้งหมด (Select All) แล้วนำมาวางได้เลย AI จะวิเคราะห์คัดแยกยี่ห้อ สเปค และอาการเสียให้เองอย่างแม่นยำ
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                    ระบุลิงก์ URL หน้ารายละเอียดงานซ่อม
                  </label>
                  <input
                    type="url"
                    required
                    disabled={parsing}
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="เช่น https://branch.nescen.in.th/..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-xs text-zinc-200 placeholder-zinc-650 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all"
                  />
                  <div className="flex items-start space-x-2 bg-amber-950/20 border border-amber-900/40 p-3 rounded-xl">
                    <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <div className="text-[10px] text-amber-400 leading-normal">
                      <span className="font-bold">ข้อควรระวัง:</span> เว็บไซต์ที่มีการจำกัดสิทธิ์ล็อกอิน หรือมีระบบความปลอดภัยของเครือข่าย อาจจะไม่สามารถดึงข้อมูลตรงๆ ได้ หากระบบแจ้งข้อผิดพลาด แนะนำให้ใช้แท็บ <span className="underline font-semibold cursor-pointer" onClick={() => setActiveTab("paste")}>"วางโค้ด HTML หรือข้อความ"</span> แทน
                    </div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={parsing || (activeTab === "url" ? !urlInput.trim() : !rawContentInput.trim())}
                className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] disabled:scale-100 disabled:bg-zinc-850 disabled:text-zinc-600 disabled:border-zinc-800 text-xs font-bold text-white border border-blue-500/20 transition-all cursor-pointer shadow-md shadow-blue-600/10"
              >
                {parsing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>กำลังประมวลผลด้วย Gemini AI...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>ดึงและวิเคราะห์ข้อมูลด้วย AI</span>
                  </>
                )}
              </button>
            </form>

            {errorMsg && (
              <div className="flex items-start space-x-2.5 bg-red-950/20 border border-red-900/40 p-3.5 rounded-xl text-xs text-red-400 whitespace-pre-line">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="font-medium">{errorMsg}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: AI Extraction Preview & Save */}
        <div className="lg:col-span-6">
          {parsing ? (
            /* Skeleton Loader of Form preview */
            <div className="glass-panel p-6 rounded-2xl border border-zinc-850 bg-zinc-900/20 space-y-5 animate-pulse">
              <div className="h-5 w-48 bg-zinc-800 rounded-full" />
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-3.5 w-24 bg-zinc-800 rounded" />
                    <div className="h-9 w-full bg-zinc-900 border border-zinc-800 rounded-xl" />
                  </div>
                ))}
                <div className="h-10 w-full bg-zinc-800 rounded-xl mt-6" />
              </div>
            </div>
          ) : parsedResult ? (
            /* Editable Preview Form */
            <div className="glass-panel p-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-4">
              <div className="flex items-center space-x-2 pb-3 border-b border-zinc-800">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <h2 className="text-sm font-bold text-white">ผลการถอดรหัสงานซ่อมโดย AI</h2>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                {/* Device Spec / Name */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                      ยี่ห้อ / รุ่นเครื่อง
                    </label>
                    <input
                      type="text"
                      required
                      value={parsedResult.deviceName}
                      onChange={(e) => setParsedResult({ ...parsedResult, deviceName: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-200 focus:outline-none focus:border-blue-600 transition-all font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                      อาการเสียเบื้องต้น
                    </label>
                    <input
                      type="text"
                      required
                      value={parsedResult.symptoms}
                      onChange={(e) => setParsedResult({ ...parsedResult, symptoms: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-200 focus:outline-none focus:border-blue-600 transition-all font-semibold"
                    />
                  </div>
                </div>

                {/* Combined Raw Text */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                    รายละเอียดเคสสำหรับวิเคราะห์คำพูด (Raw Text)
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={parsedResult.rawText}
                    onChange={(e) => setParsedResult({ ...parsedResult, rawText: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-200 focus:outline-none focus:border-blue-600 transition-all font-medium leading-relaxed"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Urgency */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                      ความเร่งด่วนของเคส
                    </label>
                    <select
                      value={parsedResult.urgencyLevel}
                      onChange={(e) => setParsedResult({ ...parsedResult, urgencyLevel: e.target.value as any })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-blue-600 transition-all cursor-pointer"
                    >
                      <option value="low">ต่ำ (ปกติ)</option>
                      <option value="medium">กลาง (ปานกลาง)</option>
                      <option value="high">สูง (คอมพัง/รีบใช้ด่วน)</option>
                    </select>
                  </div>

                  {/* Customer Type */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                      กลุ่มลูกค้า
                    </label>
                    <input
                      type="text"
                      value={parsedResult.customerType}
                      onChange={(e) => setParsedResult({ ...parsedResult, customerType: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-200 focus:outline-none focus:border-blue-600 transition-all"
                    />
                  </div>
                </div>

                {/* Related Product */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                    สินค้าแนะนำ / อะไหล่ที่เกี่ยวข้อง
                  </label>
                  <input
                    type="text"
                    value={parsedResult.relatedProductOrService}
                    onChange={(e) => setParsedResult({ ...parsedResult, relatedProductOrService: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-200 focus:outline-none focus:border-blue-600 transition-all"
                  />
                </div>

                {/* Actions */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] disabled:scale-100 disabled:bg-zinc-850 disabled:text-zinc-650 disabled:border-zinc-800 text-xs font-bold text-white border border-emerald-500/20 transition-all cursor-pointer shadow-md shadow-emerald-600/10"
                  >
                    {saving ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>กำลังบันทึกข้อมูล...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        <span>บันทึกเข้าสู่คลังปัญหา</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* Empty State */
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] bg-zinc-900/10 border border-dashed border-zinc-800 rounded-2xl p-6 text-center">
              <FileText className="w-10 h-10 text-zinc-700 mb-3" />
              <h3 className="text-sm font-bold text-zinc-400">รอรับข้อมูลการสแกน</h3>
              <p className="text-[11px] text-zinc-500 max-w-xs mt-1">
                กรอกลิงก์หรือวางโค้ดจาก NESCEN ในฝั่งซ้าย จากนั้นกด "ดึงและวิเคราะห์ข้อมูลด้วย AI" เพื่อดูตัวอย่างที่นี่
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
