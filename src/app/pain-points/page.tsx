"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  MessageSquare, 
  Sparkles, 
  Trash2, 
  Plus, 
  RefreshCw,
  Search,
  CheckCircle,
  AlertTriangle,
  Layers
} from "lucide-react";

interface PainPointAnalysis {
  corePainPoint: string;
  hiddenFear: string;
  realCustomerNeed: string;
  productServiceOpportunity: string;
  suitableContentAngle: string;
  verificationRisks: string;
}

interface PainPoint {
  id: string;
  rawText: string;
  countSeen: number;
  relatedProductOrService: string | null;
  customerType: string | null;
  urgencyLevel: string;
  category: string | null;
  status: string;
  createdAt: string;
  analysis?: PainPointAnalysis | null;
}

function PainPointsSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[...Array(3)].map((_, idx) => (
        <div key={idx} className="glass-panel p-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
            <div className="flex space-x-2">
              <div className="h-5 w-24 bg-zinc-800 rounded-full" />
              <div className="h-5 w-20 bg-zinc-850 rounded" />
            </div>
            <div className="h-4 w-32 bg-zinc-800 rounded" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 pt-2">
            <div className="md:col-span-2 space-y-2">
              <div className="h-3 w-28 bg-zinc-850 rounded" />
              <div className="h-24 bg-zinc-950 border border-zinc-800 rounded-xl" />
            </div>
            <div className="md:col-span-3 space-y-3 bg-zinc-950/80 p-4 border border-zinc-800 rounded-xl">
              <div className="h-4 w-40 bg-zinc-800 rounded" />
              <div className="grid grid-cols-2 gap-4">
                <div className="h-10 bg-zinc-900 rounded" />
                <div className="h-10 bg-zinc-900 rounded" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function PainPointsList() {
  const [painPoints, setPainPoints] = useState<PainPoint[]>([]);
  const [filteredPoints, setFilteredPoints] = useState<PainPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "analyzed">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/pain-points");
      if (res.ok) {
        const data = await res.json();
        setPainPoints(data);
      }
    } catch (error) {
      console.error("Failed to fetch pain points:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async (id: string) => {
    try {
      setAnalyzingId(id);
      const res = await fetch(`/api/pain-points/${id}/analyze`, {
        method: "POST",
      });
      if (res.ok) {
        await fetchData(); // Refresh list
      } else {
        const err = await res.json();
        alert(err.error || "เกิดข้อผิดพลาดในการวิเคราะห์");
      }
    } catch (error) {
      console.error("Analysis error:", error);
      alert("เกิดข้อผิดพลาดในการเชื่อมต่ออินเทอร์เน็ต");
    } finally {
      setAnalyzingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("คุณต้องการลบปัญหานี้ใช่หรือไม่? (การลบจะลบผลการวิเคราะห์ด้วย)")) return;

    try {
      const res = await fetch(`/api/pain-points/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchData(); // Refresh list
      }
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Apply filters and search
  useEffect(() => {
    let result = [...painPoints];

    // Status filter
    if (filter === "pending") {
      result = result.filter((pp) => pp.status === "pending");
    } else if (filter === "analyzed") {
      result = result.filter((pp) => pp.status === "analyzed");
    }

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (pp) =>
          pp.rawText.toLowerCase().includes(term) ||
          (pp.relatedProductOrService && pp.relatedProductOrService.toLowerCase().includes(term)) ||
          (pp.analysis?.corePainPoint && pp.analysis.corePainPoint.toLowerCase().includes(term))
      );
    }

    setFilteredPoints(result);
  }, [painPoints, filter, searchTerm]);

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Page Title & Action */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
            <MessageSquare className="w-5 h-5 text-blue-400" />
            <span>คลังคำถามและปัญหาของลูกค้าหน้าร้าน</span>
          </h1>
          <p className="text-xs text-zinc-400 font-medium">
            รายการคำถาม ปัญหาจริงที่เจอ ณ จุดขาย/ช่างซ่อม และผลการวิเคราะห์เจาะลึกจิตวิทยาความกังวล
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          <Link
            href="/pain-points/import"
            className="flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 hover:text-white hover:border-zinc-700 active:scale-[0.98] text-sm font-bold text-zinc-300 transition-all duration-200 cursor-pointer shadow-md"
          >
            <Sparkles className="w-4 h-4 text-blue-400" />
            <span>นำเข้าจากระบบงานซ่อม</span>
          </Link>
          <Link
            href="/pain-points/new"
            className="flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-sm font-bold text-white border border-blue-500/20 transition-all duration-200 cursor-pointer shadow-md shadow-blue-600/10"
          >
            <Plus className="w-4 h-4" />
            <span>เพิ่มปัญหาใหม่</span>
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-zinc-900/40 border border-zinc-800 p-4 rounded-2xl">
        {/* Filter tabs */}
        <div className="flex space-x-1.5 w-full md:w-auto">
          {[
            { id: "all", label: "ทั้งหมด" },
            { id: "pending", label: "รอวิเคราะห์" },
            { id: "analyzed", label: "วิเคราะห์แล้ว" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as any)}
              className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-[0.98] cursor-pointer ${
                filter === tab.id
                  ? "bg-blue-600 text-white"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ค้นหาตามข้อความ/ปัญหา/สินค้า..."
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all"
          />
        </div>
      </div>

      {/* Main List Grid */}
      {loading ? (
        <PainPointsSkeleton />
      ) : filteredPoints.length > 0 ? (
        <div className="space-y-4">
          {filteredPoints.map((pp) => (
            <div
              key={pp.id}
              className={`glass-panel p-6 rounded-2xl border transition-all duration-300 ${
                pp.status === "analyzed"
                  ? "border-zinc-800 hover:border-zinc-700 bg-zinc-900/40"
                  : "border-zinc-800 hover:border-blue-900/50 bg-blue-950/10"
              }`}
            >
              {/* Card Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-zinc-800/85">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                    pp.urgencyLevel === "high" 
                      ? "bg-red-500/10 text-red-400 border border-red-500/20" 
                      : pp.urgencyLevel === "medium"
                      ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                  }`}>
                    ความเร่งด่วน: {pp.urgencyLevel === "high" ? "สูง" : pp.urgencyLevel === "medium" ? "กลาง" : "ต่ำ"}
                  </span>
                  
                  {pp.relatedProductOrService && (
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-semibold bg-zinc-850 text-zinc-300 border border-zinc-800">
                      📦 {pp.relatedProductOrService}
                    </span>
                  )}

                  {pp.customerType && (
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-semibold bg-zinc-850 text-zinc-300 border border-zinc-800">
                      👤 {pp.customerType}
                    </span>
                  )}

                  {pp.category && (
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase tracking-wide">
                      🏷️ {pp.category}
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-3">
                  <span className="text-[10px] text-zinc-500 font-medium">
                    เจอบ่อยวันนี้: {pp.countSeen} ครั้ง | {new Date(pp.createdAt).toLocaleDateString("th-TH")}
                  </span>
                  <button
                    onClick={() => handleDelete(pp.id)}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-zinc-500 hover:text-red-400 active:scale-[0.98] transition-colors cursor-pointer"
                    title="ลบ"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Card Body */}
              <div className="pt-4 grid grid-cols-1 md:grid-cols-5 gap-6">
                {/* Left section: Raw input */}
                <div className="md:col-span-2 space-y-2">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">คำถาม/ปัญหาดิบจากลูกค้า:</span>
                  <p className="text-sm font-bold text-zinc-200 leading-relaxed bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                    "{pp.rawText}"
                  </p>

                  {pp.status === "pending" && (
                    <div className="pt-2">
                      <button
                        onClick={() => handleAnalyze(pp.id)}
                        disabled={analyzingId === pp.id}
                        className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] disabled:scale-100 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:border-zinc-800 text-xs font-bold text-white border border-blue-500/20 transition-all cursor-pointer shadow-md shadow-blue-600/5"
                      >
                        {analyzingId === pp.id ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>กำลังถอดรหัสความจริงใจ...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>ถอดรหัสจิตวิทยาและวิเคราะห์ปัญหา</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* Right section: LLM Analysis (if exists) */}
                <div className="md:col-span-3 space-y-4">
                  {pp.status === "analyzed" && pp.analysis ? (
                    <div className="space-y-3 bg-zinc-950/80 p-4 rounded-xl border border-zinc-800/80 text-xs">
                      <div className="flex items-center space-x-1.5 text-blue-400 font-bold mb-2">
                        <Sparkles className="w-4 h-4" />
                        <span>ผลวิเคราะห์ความกังวลลูกค้า (Gemini Flash)</span>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <span className="font-semibold text-zinc-500 block">🎯 สาระสำคัญของปัญหา:</span>
                          <p className="text-zinc-200 font-bold">{pp.analysis.corePainPoint}</p>
                        </div>
                        <div className="space-y-1">
                          <span className="font-semibold text-amber-400 block">😨 ความกลัวที่ซ่อนอยู่ (Hidden Fear):</span>
                          <p className="text-zinc-200 font-semibold">{pp.analysis.hiddenFear}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-zinc-800/60">
                        <div className="space-y-1">
                          <span className="font-semibold text-emerald-400 block">💚 ความต้องการที่แท้จริง:</span>
                          <p className="text-zinc-200 font-semibold">{pp.analysis.realCustomerNeed}</p>
                        </div>
                        <div className="space-y-1">
                          <span className="font-semibold text-blue-400 block">📈 โอกาสและสินค้าแนะนำ:</span>
                          <p className="text-zinc-200 font-semibold">{pp.analysis.productServiceOpportunity}</p>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-zinc-800/60 space-y-2">
                        <div className="space-y-0.5">
                          <span className="font-semibold text-purple-400 block">💡 มุมมองการทำคลิปวิดีโอ (Content Angle):</span>
                          <p className="text-zinc-200 font-semibold leading-relaxed">{pp.analysis.suitableContentAngle}</p>
                        </div>
                        {pp.analysis.verificationRisks && (
                          <div className="flex items-start space-x-1.5 bg-red-950/20 border border-red-900/50 p-2.5 rounded-lg text-[10px] text-red-400">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span><span className="font-semibold">ข้อควรระวัง/ความเสี่ยงในการถ่ายทำ:</span> {pp.analysis.verificationRisks}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full min-h-[120px] bg-zinc-950 border border-dashed border-zinc-800 rounded-xl p-4 text-center">
                      <Layers className="w-8 h-8 text-zinc-800 mb-2" />
                      <p className="text-[11px] text-zinc-500 font-medium">
                        ปัญหานี้ยังไม่ได้ทำการวิเคราะห์คลิกปุ่ม "ถอดรหัสจิตวิทยาและวิเคราะห์ปัญหา" 
                        เพื่อหา Hidden Fear และคำแนะนำสำหรับการเขียนสคริปต์
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-panel p-12 rounded-2xl border border-zinc-800 text-center space-y-4 bg-zinc-900/40">
          <MessageSquare className="w-10 h-10 text-zinc-700 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">ไม่พบปัญหาลูกค้าหน้าร้านตามที่ระบุ</h3>
            <p className="text-xs text-zinc-500 font-medium">ไม่มีปัญหาที่สอดคล้องกับตัวกรองหรือคำค้นหาของคุณ</p>
          </div>
          <Link
            href="/pain-points/new"
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-xs font-bold text-white border border-blue-500/20 transition-all cursor-pointer shadow-md shadow-blue-600/10"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>สร้างปัญหาแรกของคุณ</span>
          </Link>
        </div>
      )}
    </div>
  );
}
