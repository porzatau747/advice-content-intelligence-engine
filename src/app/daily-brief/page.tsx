"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  FileText, 
  Sparkles, 
  Trash2, 
  RefreshCw, 
  ArrowRight,
  MessageSquare,
  Rss,
  CheckCircle,
  HelpCircle,
  Clock
} from "lucide-react";

interface PainPoint {
  id: string;
  rawText: string;
  category: string | null;
  status: string;
  analysis?: {
    corePainPoint: string;
  } | null;
}

interface ExternalSignal {
  id: string;
  title: string;
  status: string;
  sourceType: string;
  analysis?: {
    signalSummary: string;
  } | null;
}

interface DailyBrief {
  id: string;
  briefDate: string;
  summary: string;
  customerInsight: string;
}

function MatchesSkeleton() {
  return (
    <div className="space-y-2 max-h-48 overflow-y-auto pr-1 animate-pulse">
      {[...Array(2)].map((_, idx) => (
        <div key={idx} className="flex items-start space-x-3 p-3 rounded-xl border border-zinc-850 bg-zinc-950/50">
          <div className="h-4 w-4 bg-zinc-800 rounded mt-1 shrink-0" />
          <div className="space-y-2 flex-1">
            <div className="h-4 w-3/4 bg-zinc-800 rounded" />
            <div className="h-3 w-5/6 bg-zinc-850 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

function BriefHistorySkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[...Array(3)].map((_, idx) => (
        <div key={idx} className="glass-panel p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-3.5 w-24 bg-zinc-800 rounded" />
            <div className="h-5 w-5 bg-zinc-850 rounded" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-3/4 bg-zinc-800 rounded" />
            <div className="h-3 w-5/6 bg-zinc-850 rounded" />
          </div>
          <div className="flex justify-end pt-2 border-t border-zinc-800/60">
            <div className="h-7 w-24 bg-zinc-900 border border-zinc-800 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function DailyBriefs() {
  const router = useRouter();
  const [briefs, setBriefs] = useState<DailyBrief[]>([]);
  const [painPoints, setPainPoints] = useState<PainPoint[]>([]);
  const [signals, setSignals] = useState<ExternalSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Form selections
  const [selectedPainPoints, setSelectedPainPoints] = useState<string[]>([]);
  const [selectedSignals, setSelectedSignals] = useState<string[]>([]);

  // Semantic matching states
  const [matchedSignals, setMatchedSignals] = useState<{
    signalId: string;
    isHighlyRelevant: boolean;
    reason: string;
  }[]>([]);
  const [showAllTrends, setShowAllTrends] = useState(false);
  const [loadingMatches, setLoadingMatches] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch briefs
      const briefsRes = await fetch("/api/daily-brief");
      const briefsData = briefsRes.ok ? await briefsRes.json() : [];
      setBriefs(briefsData);

      // Fetch pain points (only show analyzed ones since they are required for structured brief generation)
      const ppRes = await fetch("/api/pain-points");
      const ppData: PainPoint[] = ppRes.ok ? await ppRes.json() : [];
      setPainPoints(ppData.filter(pp => pp.status === "analyzed"));

      // Fetch signals (only show analyzed ones, optional)
      const sigRes = await fetch("/api/external-signals");
      const sigData: ExternalSignal[] = sigRes.ok ? await sigRes.json() : [];
      setSignals(sigData.filter(s => s.status === "analyzed"));

    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedPainPoints.length === 0) {
      alert("กรุณาเลือกปัญหาลูกค้าหน้าร้านอย่างน้อย 1 รายการเพื่อสร้างบรีฟ");
      return;
    }

    try {
      setGenerating(true);
      const res = await fetch("/api/daily-brief/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          painPointIds: selectedPainPoints,
          externalSignalIds: selectedSignals,
        }),
      });

      if (res.ok) {
        const newBrief = await res.json();
        // Redirect to detail page
        router.push(`/daily-brief/${newBrief.id}`);
      } else {
        const err = await res.json();
        alert(err.error || "เกิดข้อผิดพลาดในการสร้างบรีฟ");
      }
    } catch (error) {
      console.error("Generate error:", error);
      alert("เกิดข้อผิดพลาดในการเชื่อมต่ออินเทอร์เน็ต");
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("คุณต้องการลบบรีฟนี้ใช่หรือไม่?")) return;
    try {
      const res = await fetch(`/api/daily-brief/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchData(); // Refresh
      }
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  const togglePainPoint = (id: string) => {
    setSelectedPainPoints(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSignal = (id: string) => {
    setSelectedSignals(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const fetchMatches = async (ids: string[]) => {
    if (ids.length === 0) {
      setMatchedSignals([]);
      setSelectedSignals([]);
      return;
    }

    try {
      setLoadingMatches(true);
      const res = await fetch("/api/external-signals/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ painPointIds: ids }),
      });
      if (res.ok) {
        const data = await res.json();
        setMatchedSignals(data);
        // Clean up selected signals that are no longer matched if we filter them out
        if (!showAllTrends) {
          const matchedIds = new Set<string>(
            data.filter((m: any) => m.isHighlyRelevant).map((m: any) => m.signalId)
          );
          setSelectedSignals((prev) => prev.filter((id) => matchedIds.has(id)));
        }
      }
    } catch (error) {
      console.error("Failed to fetch matches:", error);
    } finally {
      setLoadingMatches(false);
    }
  };

  useEffect(() => {
    fetchMatches(selectedPainPoints);
  }, [selectedPainPoints]);

  useEffect(() => {
    fetchData();
  }, []);

  const highlyRelevantSignalIds = new Set(
    matchedSignals.filter((m) => m.isHighlyRelevant).map((m) => m.signalId)
  );
  const visibleSignals = showAllTrends
    ? signals
    : signals.filter((s) => highlyRelevantSignalIds.has(s.id));

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Title */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
          <FileText className="w-6 h-6 text-blue-400" />
          <span>ใบสั่งถ่ายวิดีโอประจำวัน (Daily Brief Generator)</span>
        </h1>
        <p className="text-xs text-zinc-400">
          สร้างวิดีโอสคริปต์ 3 ประเภท (Educate, Sell, Repair) โดยการนำปัญหาจริงหน้าร้านร่วมกับเทรนด์เทคโนโลยีภายนอกมาสร้าง
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left Column: Generate form */}
        <div className="lg:col-span-3 space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-6">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <span>สร้าง Brief ใบสั่งถ่ายใหม่</span>
            </h3>

            <form onSubmit={handleGenerate} className="space-y-6">
              {/* Step 1: Select Pain Points (Required) */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
                  1. เลือกปัญหาของลูกค้าหน้าร้าน (Pain Points) <span className="text-red-500">*</span>
                </label>
                <p className="text-[10px] text-zinc-500">
                  ต้องเป็นปัญหาที่ผ่านขั้นตอนการวิเคราะห์ด้วย AI (Analyzed) แล้วเท่านั้น
                </p>

                {painPoints.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {painPoints.map((pp) => {
                      const isChecked = selectedPainPoints.includes(pp.id);
                      return (
                        <div
                          key={pp.id}
                          onClick={() => togglePainPoint(pp.id)}
                          className={`flex items-start space-x-3 p-3 rounded-xl border transition-all cursor-pointer ${
                            isChecked
                              ? "bg-blue-500/10 border-blue-500 text-zinc-100"
                              : "bg-zinc-950 border-zinc-850 hover:bg-zinc-900/40 text-zinc-400"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}} // handled by div click
                            className="mt-1 w-4 h-4 rounded border-zinc-700 bg-zinc-950 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <div className="text-xs space-y-1">
                            <p className="font-bold text-white line-clamp-1">"{pp.rawText}"</p>
                            <p className="text-[10px] text-zinc-500 font-medium">{pp.analysis?.corePainPoint}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="border border-dashed border-zinc-800 rounded-xl p-6 text-center text-zinc-500 text-xs">
                    ไม่พบข้อมูลปัญหาที่วิเคราะห์แล้ว กรุณาไปหน้า{" "}
                    <Link href="/pain-points" className="text-blue-400 font-bold hover:underline">
                      ปัญหาหน้าร้านทั้งหมด
                    </Link>{" "}
                    เพื่อสแกนและวิเคราะห์ปัญหาลูกค้าก่อน
                  </div>
                )}
              </div>

              {/* Step 2: Select External Signals (Optional) */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
                    2. เลือกเทรนด์ประกอบเพิ่มเติม (External Signals - เสริม)
                  </label>
                  {selectedPainPoints.length > 0 && (
                    <label className="flex items-center space-x-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={showAllTrends}
                        onChange={(e) => {
                          setShowAllTrends(e.target.checked);
                          if (!e.target.checked) {
                            // If switching off showAllTrends, deselect non-matched ones
                            setSelectedSignals((prev) =>
                              prev.filter((id) => highlyRelevantSignalIds.has(id))
                            );
                          }
                        }}
                        className="w-3.5 h-3.5 rounded border-zinc-700 bg-zinc-950 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span className="text-[10px] text-zinc-500 font-medium">แสดงเทรนด์ทั้งหมด (ไม่แนะนำ)</span>
                    </label>
                  )}
                </div>

                {selectedPainPoints.length === 0 ? (
                  <div className="border border-dashed border-zinc-850 rounded-xl p-6 text-center text-zinc-500 text-xs">
                    กรุณาเลือกปัญหาของลูกค้าก่อน เพื่อให้ AI คัดกรองเทรนด์ที่เกี่ยวข้อง
                  </div>
                ) : loadingMatches ? (
                  <MatchesSkeleton />
                ) : visibleSignals.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {visibleSignals.map((s) => {
                      const isChecked = selectedSignals.includes(s.id);
                      const matchedItem = matchedSignals.find((m) => m.signalId === s.id);
                      const isMatched = !!matchedItem;
                      const isHighlyRelevant = matchedItem?.isHighlyRelevant;
                      const matchReason = matchedItem?.reason;

                      return (
                        <div
                          key={s.id}
                          onClick={() => toggleSignal(s.id)}
                          className={`flex items-start space-x-3 p-3 rounded-xl border transition-all cursor-pointer ${
                            isChecked
                              ? "bg-blue-500/10 border-blue-500 text-zinc-100"
                              : "bg-zinc-950 border-zinc-850 hover:bg-zinc-900/40 text-zinc-400"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}} // handled by div click
                            className="mt-1 w-4 h-4 rounded border-zinc-700 bg-zinc-950 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <div className="text-xs space-y-1 w-full">
                            <p className="font-bold text-white line-clamp-1">{s.title}</p>
                            <p className="text-[10px] text-zinc-500 font-medium">{s.analysis?.signalSummary}</p>
                            {isMatched && isHighlyRelevant && matchReason && (
                              <div className="mt-1.5">
                                <div className="text-[10px] text-blue-400 font-bold bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 inline-block">
                                  🔥 แนะนำโดย AI: {matchReason}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="border border-dashed border-zinc-800 rounded-xl p-6 text-center text-zinc-500 text-xs space-y-2 bg-zinc-950/20">
                    <p>ไม่มีเทรนด์ภายนอกที่ตรงกับปัญหานี้โดยตรง (สามารถกดสร้างสคริปต์จากปัญหาหน้าร้านล้วนๆ ได้เลย)</p>
                    <button
                      type="button"
                      onClick={() => setShowAllTrends(true)}
                      className="text-xs text-blue-400 font-bold hover:underline"
                    >
                      คลิกเพื่อดูเทรนด์ทั้งหมด
                    </button>
                  </div>
                )}
              </div>

              {/* Form Action */}
              <div className="pt-4 border-t border-zinc-800 flex justify-end">
                <button
                  type="submit"
                  disabled={generating || selectedPainPoints.length === 0}
                  className="flex items-center space-x-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] disabled:scale-100 disabled:bg-zinc-850 disabled:text-zinc-650 text-sm font-bold text-white border border-blue-500/20 transition-all cursor-pointer shadow-lg shadow-blue-600/10"
                >
                  {generating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>กำลังสร้างสคริปต์ 3 คลิป...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>สร้างบรีฟและสคริปต์โดย Gemini</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: History List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center space-x-2">
              <Clock className="w-4 h-4 text-purple-400" />
              <span>ประวัติ Daily Brief ทั้งหมด ({briefs.length})</span>
            </h3>
          </div>

          {loading ? (
            <BriefHistorySkeleton />
          ) : briefs.length > 0 ? (
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
              {briefs.map((brief) => (
                <div key={brief.id} className="glass-panel p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-3 hover:border-zinc-700 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-zinc-500 font-medium">
                      บรีฟวันที่ {new Date(brief.briefDate).toLocaleDateString("th-TH")}
                    </span>
                    <button
                      onClick={() => handleDelete(brief.id)}
                      className="p-1 rounded hover:bg-red-500/10 text-zinc-500 hover:text-red-400 active:scale-[0.98] transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-white line-clamp-1">{brief.summary}</h4>
                    <p className="text-[10px] text-zinc-400 line-clamp-2 leading-relaxed mt-1 font-medium">
                      Insight: {brief.customerInsight}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-zinc-850 flex justify-end">
                    <Link
                      href={`/daily-brief/${brief.id}`}
                      className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 active:scale-[0.98] text-blue-400 border border-blue-500/25 text-[10px] font-bold transition-all cursor-pointer"
                    >
                      <span>เปิดสคริปต์วิดีโอ</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="border border-dashed border-zinc-800 rounded-xl p-8 text-center text-zinc-500 text-xs bg-zinc-950/20">
              ยังไม่มีการบันทึกประวัติบรีฟ เลือกปัญหานำเข้ารวมกับเทรนด์และสั่งรันเพื่อผลิตบรีฟแรก
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
