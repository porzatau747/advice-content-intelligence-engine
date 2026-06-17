"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  MessageSquare, 
  Rss, 
  FileText, 
  Sparkles, 
  TrendingUp, 
  Plus, 
  ArrowRight,
  RefreshCw,
  Clock
} from "lucide-react";

interface Stats {
  totalPainPoints: number;
  pendingPainPoints: number;
  totalSignals: number;
  totalBriefs: number;
}

interface PainPoint {
  id: string;
  rawText: string;
  countSeen: number;
  urgencyLevel: string;
  createdAt: string;
  status: string;
}

interface DailyBrief {
  id: string;
  briefDate: string;
  summary: string;
  customerInsight: string;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8 max-w-6xl animate-pulse">
      {/* Welcome Banner Skeleton */}
      <div className="h-32 bg-zinc-900/40 border border-zinc-800 rounded-2xl w-full" />

      {/* Quick Stats Grid Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, idx) => (
          <div key={idx} className="h-24 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl" />
        ))}
      </div>

      {/* Main Content Dashboard Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <div className="h-4 w-32 bg-zinc-900 rounded" />
          <div className="h-64 bg-zinc-900/40 border border-zinc-800 rounded-2xl w-full" />
        </div>
        <div className="lg:col-span-2 space-y-6">
          <div className="h-4 w-32 bg-zinc-900 rounded" />
          <div className="space-y-3">
            {[...Array(2)].map((_, idx) => (
              <div key={idx} className="h-36 bg-zinc-900/40 border border-zinc-800 rounded-xl w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    totalPainPoints: 0,
    pendingPainPoints: 0,
    totalSignals: 0,
    totalBriefs: 0,
  });
  const [pendingPainPoints, setPendingPainPoints] = useState<PainPoint[]>([]);
  const [latestBrief, setLatestBrief] = useState<DailyBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch pain points
      const ppRes = await fetch("/api/pain-points");
      const ppData: PainPoint[] = ppRes.ok ? await ppRes.json() : [];

      // Fetch signals
      const sigRes = await fetch("/api/external-signals");
      const sigData = sigRes.ok ? await sigRes.json() : [];

      // Fetch briefs
      const briefRes = await fetch("/api/daily-brief");
      const briefData: DailyBrief[] = briefRes.ok ? await briefRes.json() : [];

      const totalPainPoints = ppData.length;
      const pending = ppData.filter(pp => pp.status === "pending");
      
      setStats({
        totalPainPoints,
        pendingPainPoints: pending.length,
        totalSignals: sigData.length,
        totalBriefs: briefData.length,
      });

      setPendingPainPoints(pending.slice(0, 3)); // show top 3 pending
      setLatestBrief(briefData[0] || null); // latest brief
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
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
        await fetchData(); // Refresh dashboard
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

  useEffect(() => {
    fetchData();
  }, []);

  if (loading && pendingPainPoints.length === 0) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Welcome Banner */}
      <div className="glass-panel p-8 rounded-2xl border border-zinc-800 bg-zinc-900/40 bg-gradient-to-r from-blue-950/10 via-zinc-900/10 to-zinc-950 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-blue-400" />
            <span>สร้างคอนเทนต์วิดีโอจากหน้าเคาน์เตอร์จริง</span>
          </h2>
          <p className="text-sm text-zinc-400 max-w-2xl leading-relaxed font-medium">
            ระบบช่วยวิเคราะห์ปัญหาของลูกค้าจากแผนกขายและแผนกช่างซ่อมของร้าน Advice สามร้อยยอด 
            และนำเสนอหัวข้อคลิปพร้อมสคริปต์พูดอย่างเป็นระบบเพื่อผลิต Reels/Shorts ได้ทันที
          </p>
        </div>
        <div className="flex space-x-3 shrink-0">
          <Link
            href="/pain-points/new"
            className="flex items-center space-x-2 px-5 py-3 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-500 active:scale-[0.98] transition-all duration-200 shadow-md shadow-blue-600/10 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>เพิ่มปัญหาหน้าร้าน</span>
          </Link>
          <Link
            href="/daily-brief"
            className="flex items-center space-x-2 px-5 py-3 rounded-xl bg-zinc-800 text-zinc-300 font-bold text-sm hover:bg-zinc-700 active:scale-[0.98] transition-all duration-200 border border-zinc-700 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-blue-400" />
            <span>สร้าง Brief ประจำวัน</span>
          </Link>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "ปัญหาหน้าร้านทั้งหมด", count: stats.totalPainPoints, icon: MessageSquare, color: "text-blue-400 bg-blue-500/10 border border-blue-500/20" },
          { label: "ปัญหาที่ยังไม่ได้วิเคราะห์", count: stats.pendingPainPoints, icon: Clock, color: "text-amber-400 bg-amber-500/10 border border-amber-500/20" },
          { label: "สัญญาณภายนอกที่เซฟ", count: stats.totalSignals, icon: Rss, color: "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20" },
          { label: "Daily Brief ที่สร้างแล้ว", count: stats.totalBriefs, icon: FileText, color: "text-purple-400 bg-purple-500/10 border border-purple-500/20" }
        ].map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="glass-panel p-5 rounded-2xl border border-zinc-800/80 flex items-center justify-between bg-zinc-900/40">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{stat.label}</p>
                <p className="text-3xl font-extrabold text-white tracking-tight">{stat.count}</p>
              </div>
              <div className={`p-3 rounded-xl ${stat.color}`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Content Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left Column: Today's Brief */}
        <div className="lg:col-span-3 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white tracking-tight flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <span>Daily Brief ล่าสุด</span>
            </h3>
            {latestBrief && (
              <Link href={`/daily-brief/${latestBrief.id}`} className="text-xs text-blue-400 hover:text-blue-300 font-bold flex items-center space-x-1">
                <span>ดูรายละเอียดทั้งหมด</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            )}
          </div>

          {latestBrief ? (
            <div className="glass-panel p-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 transition-all duration-300 space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center space-x-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                  <span>Brief ของวันที่ {new Date(latestBrief.briefDate).toLocaleDateString("th-TH", { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                </span>
              </div>
              <div className="space-y-2">
                <h4 className="text-base font-bold text-white">{latestBrief.summary}</h4>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  <span className="font-bold text-zinc-300">เจาะลึกความต้องการลูกค้า:</span> {latestBrief.customerInsight}
                </p>
              </div>
              <div className="pt-4 border-t border-zinc-850 flex justify-between items-center">
                <span className="text-xs text-zinc-500">มี 3 บทสคริปต์ย่อย (Educate, Sell, Repair)</span>
                <Link
                  href={`/daily-brief/${latestBrief.id}`}
                  className="flex items-center space-x-2 text-xs font-bold text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 active:scale-[0.98] border border-blue-500/25 px-3.5 py-2 rounded-xl transition-all duration-200"
                >
                  <span>เปิดดูสคริปต์ถ่ายทำ</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="glass-panel p-8 rounded-2xl border border-zinc-800 text-center space-y-4 bg-zinc-900/40">
              <p className="text-sm text-zinc-500 font-medium">ยังไม่มีการสร้าง Daily Brief สำหรับวันนี้</p>
              <Link
                href="/daily-brief"
                className="inline-flex items-center space-x-2 px-5 py-3 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-500 active:scale-[0.98] transition-all duration-200 shadow-md shadow-blue-600/10"
              >
                <span>เริ่มสร้าง Daily Brief ตัวแรก</span>
              </Link>
            </div>
          )}
        </div>

        {/* Right Column: Pending Pain Points & Quick Actions */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white tracking-tight flex items-center space-x-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>ปัญหาที่รอวิเคราะห์</span>
            </h3>
            <Link href="/pain-points" className="text-xs text-zinc-500 hover:text-zinc-300 font-bold flex items-center space-x-1">
              <span>ดูทั้งหมด</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-3">
            {pendingPainPoints.length > 0 ? (
              pendingPainPoints.map((pp) => (
                <div key={pp.id} className="glass-panel p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                      pp.urgencyLevel === "high" 
                        ? "bg-red-500/10 text-red-400 border border-red-500/20" 
                        : pp.urgencyLevel === "medium"
                        ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                    }`}>
                      ความเร่งด่วน: {pp.urgencyLevel === "high" ? "สูง" : pp.urgencyLevel === "medium" ? "กลาง" : "ต่ำ"}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-medium">
                      {new Date(pp.createdAt).toLocaleDateString("th-TH")}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-zinc-200 line-clamp-2 leading-relaxed">
                    "{pp.rawText}"
                  </p>
                  <div className="flex justify-end pt-1">
                    <button
                      onClick={() => handleAnalyze(pp.id)}
                      disabled={analyzingId === pp.id}
                      className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 active:scale-[0.98] disabled:scale-100 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:border-zinc-800 text-[11px] font-bold text-white border border-blue-500/20 transition-all duration-200 cursor-pointer"
                    >
                      {analyzingId === pp.id ? (
                        <>
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          <span>กำลังวิเคราะห์...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3 h-3" />
                          <span>วิเคราะห์ด้วย Gemini</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="glass-panel p-6 rounded-xl border border-zinc-800 text-center bg-zinc-900/40">
                <p className="text-xs text-zinc-500 font-medium">ไม่มีปัญหาค้างวิเคราะห์หน้าร้าน</p>
              </div>
            )}
          </div>

          {/* Quick External Trends fetch */}
          <div className="glass-panel p-5 rounded-2xl border border-zinc-800 space-y-4 bg-zinc-900/40">
            <h4 className="text-sm font-bold text-white flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span>เทรนด์ไอทีจากต่างประเทศ/ภายนอก</span>
            </h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              สแกนหาสัญญาณเทรนด์ไอทีล่าสุดบน YouTube หรือ Google Trends เพื่อใช้ประกอบกับปัญหาจริงของลูกค้าหน้าร้าน
            </p>
            <Link
              href="/external-signals"
              className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-zinc-800 text-zinc-300 font-bold text-xs hover:bg-zinc-700 active:scale-[0.98] transition-all duration-200 border border-zinc-700 cursor-pointer"
            >
              <Rss className="w-3.5 h-3.5 text-zinc-500" />
              <span>ดึงสัญญาณไอที (API Fetch)</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
