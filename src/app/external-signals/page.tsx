"use client";

import { useEffect, useState } from "react";
import { 
  Rss, 
  Search, 
  Video, 
  TrendingUp, 
  Sparkles, 
  Save, 
  Trash2, 
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  ExternalLink
} from "lucide-react";

interface SavedSignalAnalysis {
  signalSummary: string;
  audienceRelevance: string;
  suggestedContentAngle: string;
  possibleHooks: string; // JSON string array
}

interface SavedSignal {
  id: string;
  sourceType: "youtube_api" | "google_trends";
  title: string;
  summary: string | null;
  sourceUrl: string | null;
  metrics: string | null; // JSON string
  relatedKeywords: string | null; // JSON string array
  status: string;
  fetchedAt: string;
  analysis?: SavedSignalAnalysis | null;
}

interface SearchResult {
  id?: string;
  title: string;
  description: string;
  sourceUrl: string;
  metrics?: {
    views?: string;
    likes?: string;
  };
  traffic?: string; // For google trends
  relatedKeywords: string[];
  sourceType: "youtube_api" | "google_trends";
}

function SearchSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[...Array(3)].map((_, idx) => (
        <div key={idx} className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 flex items-start justify-between gap-4">
          <div className="space-y-2 flex-1">
            <div className="h-4 w-20 bg-zinc-900 rounded" />
            <div className="h-4 w-3/4 bg-zinc-900 rounded" />
            <div className="h-3 w-5/6 bg-zinc-900 rounded" />
          </div>
          <div className="h-8 w-24 bg-zinc-900 rounded-lg shrink-0 animate-pulse" />
        </div>
      ))}
    </div>
  );
}

function SavedSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[...Array(3)].map((_, idx) => (
        <div key={idx} className="glass-panel p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-4 w-16 bg-zinc-800 rounded" />
            <div className="h-6 w-6 bg-zinc-850 rounded" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-3/4 bg-zinc-800 rounded" />
            <div className="h-3 w-5/6 bg-zinc-800 rounded" />
          </div>
          <div className="h-8 bg-zinc-900 border border-zinc-800 rounded-lg w-full" />
        </div>
      ))}
    </div>
  );
}

export default function ExternalSignals() {
  // Saved list states
  const [savedSignals, setSavedSignals] = useState<SavedSignal[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);

  // Search states
  const [searchType, setSearchType] = useState<"youtube" | "google_trends">("youtube");
  const [searchQuery, setSearchQuery] = useState("แก้ปัญหาคอม");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [savingUrl, setSavingUrl] = useState<string | null>(null);

  const fetchSaved = async () => {
    try {
      setLoadingSaved(true);
      const res = await fetch("/api/external-signals");
      if (res.ok) {
        const data = await res.json();
        setSavedSignals(data);
      }
    } catch (error) {
      console.error("Failed to load saved signals:", error);
    } finally {
      setLoadingSaved(false);
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      setLoadingSearch(true);
      setSearchResults([]);

      if (searchType === "youtube") {
        const res = await fetch(`/api/external-signals/fetch-youtube?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          // Map to uniform SearchResult structure
          const formatted = data.map((item: any) => ({
            id: item.id,
            title: item.title,
            description: item.description,
            sourceUrl: item.sourceUrl,
            metrics: item.metrics,
            relatedKeywords: item.relatedKeywords || [],
            sourceType: "youtube_api",
          }));
          setSearchResults(formatted);
        } else {
          const err = await res.json();
          alert(err.error || "เกิดข้อผิดพลาดในการดึงข้อมูลจาก YouTube API");
        }
      } else {
        const res = await fetch("/api/external-signals/fetch-trends");
        if (res.ok) {
          const data = await res.json();
          // Map to uniform SearchResult structure
          const formatted = data.map((item: any) => ({
            title: item.title,
            description: item.description,
            sourceUrl: item.sourceUrl,
            traffic: item.traffic,
            relatedKeywords: item.relatedKeywords || [],
            sourceType: "google_trends",
          }));
          setSearchResults(formatted);
        } else {
          const err = await res.json();
          alert(err.error || "เกิดข้อผิดพลาดในการดึงข้อมูล Google Trends RSS");
        }
      }
    } catch (error) {
      console.error("Search error:", error);
      alert("เกิดข้อผิดพลาดในการเชื่อมต่ออินเทอร์เน็ต");
    } finally {
      setLoadingSearch(false);
    }
  };

  const handleSave = async (result: SearchResult) => {
    try {
      setSavingUrl(result.sourceUrl);
      const res = await fetch("/api/external-signals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceType: result.sourceType,
          title: result.title,
          summary: result.description,
          sourceUrl: result.sourceUrl,
          metrics: result.metrics || (result.traffic ? { traffic: result.traffic } : null),
          relatedKeywords: result.relatedKeywords,
        }),
      });

      if (res.ok) {
        await fetchSaved(); // Refresh saved list
      } else {
        const err = await res.json();
        alert(err.error || "ไม่สามารถเซฟข้อมูลได้");
      }
    } catch (error) {
      console.error("Save error:", error);
    } finally {
      setSavingUrl(null);
    }
  };

  const handleAnalyze = async (id: string) => {
    try {
      setAnalyzingId(id);
      const res = await fetch(`/api/external-signals/${id}/analyze`, {
        method: "POST",
      });
      if (res.ok) {
        await fetchSaved(); // Refresh saved list
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
    if (!confirm("ต้องการลบสัญญาณภายนอกนี้ใช่หรือไม่?")) return;
    try {
      const res = await fetch(`/api/external-signals/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchSaved();
      } else {
        alert("ไม่สามารถลบข้อมูลได้");
      }
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  useEffect(() => {
    fetchSaved();
    handleSearch();
  }, []);

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Title */}
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
          <Rss className="w-5 h-5 text-blue-400" />
          <span>ดึงสัญญาณไอทีภายนอกหน้าร้าน (External Signal Engine)</span>
        </h1>
        <p className="text-xs text-zinc-400 font-medium">
          ดึงวิดีโอ Shorts ที่เป็นที่นิยมบน YouTube และยอดคำค้นหาด่วนบน Google Trends ในไทย เพื่อนำมาวิเคราะห์และต่อยอดคู่กับปัญหาจริงหน้าร้าน
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left column: API search and save */}
        <div className="lg:col-span-3 space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-zinc-800 space-y-6 bg-zinc-900/40">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Search className="w-4 h-4 text-blue-400" />
              <span>ดึงกระแสออนไลน์ (Live Fetch)</span>
            </h3>

            {/* Type selector */}
            <div className="flex space-x-2 p-1 bg-zinc-950 rounded-xl border border-zinc-800">
              <button
                onClick={() => setSearchType("youtube")}
                className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-lg text-xs font-bold transition-all active:scale-[0.98] cursor-pointer ${
                  searchType === "youtube"
                    ? "bg-blue-600 text-white"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Video className="w-4 h-4" />
                <span>YouTube Shorts (ตามคีย์เวิร์ด)</span>
              </button>
              <button
                onClick={() => setSearchType("google_trends")}
                className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-lg text-xs font-bold transition-all active:scale-[0.98] cursor-pointer ${
                  searchType === "google_trends"
                    ? "bg-blue-600 text-white"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                <span>Google Trends TH (RSS Daily)</span>
              </button>
            </div>

            {/* Search inputs */}
            {searchType === "youtube" && (
              <form onSubmit={handleSearch} className="flex space-x-2">
                <input
                  type="text"
                  required
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="พิมพ์คำค้นหา เช่น คอมช้า, อัปเกรดการ์ดจอ, ซ่อมเครื่อง..."
                  className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all"
                />
                <button
                  type="submit"
                  disabled={loadingSearch}
                  className="flex items-center space-x-1.5 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] disabled:scale-100 disabled:bg-zinc-850 disabled:text-zinc-600 disabled:border-zinc-800 text-xs font-bold text-white border border-blue-500/20 transition-all cursor-pointer shadow-md shadow-blue-600/10"
                >
                  {loadingSearch ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                  <span>ค้นหา</span>
                </button>
              </form>
            )}

            {/* Fetch status/results */}
            {loadingSearch ? (
              <SearchSkeleton />
            ) : searchResults.length > 0 ? (
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                {searchResults.map((result, idx) => {
                  const isSaved = savedSignals.some((s) => s.sourceUrl === result.sourceUrl);
                  return (
                    <div key={idx} className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 flex items-start justify-between gap-4">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center space-x-1.5">
                          {result.sourceType === "youtube_api" ? (
                            <span className="bg-red-500/10 text-red-400 border border-red-500/20 text-[9px] font-bold px-1.5 py-0.5 rounded">YT Shorts</span>
                          ) : (
                            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold px-1.5 py-0.5 rounded">Google Trends</span>
                          )}
                          
                          {result.metrics?.views && (
                            <span className="text-[10px] text-zinc-500 font-medium">ยอดวิว: {Number(result.metrics.views).toLocaleString("th-TH")} ครั้ง</span>
                          )}
                          {result.traffic && (
                            <span className="text-[10px] text-emerald-400 font-bold">ค้นหา: {result.traffic}</span>
                          )}
                        </div>
                        <h4 className="text-xs font-bold text-white line-clamp-1">{result.title}</h4>
                        <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                          {result.description}
                        </p>
                        <div className="flex items-center space-x-2 pt-1.5">
                          <a
                            href={result.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center space-x-1 text-[10px] text-zinc-500 hover:text-zinc-300 font-bold"
                          >
                            <span>เปิดลิงก์ภายนอก</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {isSaved ? (
                          <span className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                            <span>เซฟแล้ว</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => handleSave(result)}
                            disabled={savingUrl === result.sourceUrl}
                            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 active:scale-[0.98] disabled:scale-100 disabled:bg-zinc-850 disabled:text-zinc-600 disabled:border-zinc-800 text-[10px] font-bold text-white border border-blue-500/20 transition-all cursor-pointer shadow-md shadow-blue-600/5"
                          >
                            {savingUrl === result.sourceUrl ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Save className="w-3 h-3" />
                            )}
                            <span>เซฟลงคลัง</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="border border-dashed border-zinc-800 rounded-xl p-8 text-center text-zinc-500 text-xs font-medium bg-zinc-950/20">
                ไม่มีผลการค้นหา กดค้นหาเพื่อสแกนกระแสในประเทศไทย
              </div>
            )}
          </div>
        </div>

        {/* Right column: Saved Signals list & analyze */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center space-x-2">
              <Save className="w-4 h-4 text-emerald-400" />
              <span>คลังสัญญาณที่เซฟไว้ ({savedSignals.length})</span>
            </h3>
          </div>

          {loadingSaved ? (
            <SavedSkeleton />
          ) : savedSignals.length > 0 ? (
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
              {savedSignals.map((signal) => (
                <div key={signal.id} className="glass-panel p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-3 hover:border-zinc-700 transition-all duration-200">
                  <div className="flex items-center justify-between">
                    {signal.sourceType === "youtube_api" ? (
                      <span className="bg-red-500/10 text-red-400 border border-red-500/20 text-[9px] font-bold px-1.5 py-0.5 rounded">YT Shorts</span>
                    ) : (
                      <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold px-1.5 py-0.5 rounded">Google Trends</span>
                    )}

                    <button
                      onClick={() => handleDelete(signal.id)}
                      className="p-1 rounded hover:bg-red-500/10 text-zinc-500 hover:text-red-400 active:scale-[0.98] transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-white line-clamp-1">{signal.title}</h4>
                    <p className="text-[10px] text-zinc-500 line-clamp-2 leading-relaxed mt-1 font-medium">"{signal.summary}"</p>
                  </div>

                  {signal.status === "saved" ? (
                    <div>
                      <button
                        onClick={() => handleAnalyze(signal.id)}
                        disabled={analyzingId === signal.id}
                        className="w-full flex items-center justify-center space-x-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 active:scale-[0.98] disabled:scale-100 disabled:bg-zinc-850 disabled:text-zinc-500 disabled:border-zinc-800 text-[10px] font-bold text-white border border-blue-500/20 transition-all cursor-pointer shadow-md shadow-blue-600/5"
                      >
                        {analyzingId === signal.id ? (
                          <>
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            <span>กำลังวิเคราะห์...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3 h-3" />
                            <span>วิเคราะห์โอกาสทำคลิป</span>
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    signal.analysis && (
                      <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 text-[10px] space-y-2">
                        <div className="flex items-center space-x-1 text-blue-400 font-bold">
                          <Sparkles className="w-3 h-3" />
                          <span>วิเคราะห์เสร็จแล้ว</span>
                        </div>
                        <div className="space-y-1">
                          <span className="font-semibold text-zinc-500 block">🎯 สรุปสัญญาณ:</span>
                          <p className="text-zinc-200 font-bold">{signal.analysis.signalSummary}</p>
                        </div>
                        <div className="space-y-1">
                          <span className="font-semibold text-purple-400 block">💡 แนะนำมุมคอนเทนต์ร้านไอที:</span>
                          <p className="text-zinc-200 font-semibold leading-relaxed">{signal.analysis.suggestedContentAngle}</p>
                        </div>
                        {signal.analysis.possibleHooks && (
                          <div className="space-y-1">
                            <span className="font-semibold text-emerald-400 block">🪝 Hook แนะนำ (3 วิแรก):</span>
                            <ul className="list-disc pl-3.5 space-y-0.5 text-zinc-200 font-semibold">
                              {(JSON.parse(signal.analysis.possibleHooks) as string[]).map((hook, idx) => (
                                <li key={idx}>"{hook}"</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="border border-dashed border-zinc-800 rounded-xl p-8 text-center text-zinc-500 text-xs font-medium bg-zinc-900/40">
              คลังสัญญาณยังว่างเปล่า เซฟกระแสออนไลน์ที่ฝั่งซ้ายเพื่อนำมาวิเคราะห์ต่อที่นี่
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
