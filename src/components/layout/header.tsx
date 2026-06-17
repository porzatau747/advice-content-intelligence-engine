"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";

export function Header() {
  const [keysStatus, setKeysStatus] = useState<{
    hasGeminiKey: boolean;
    hasYoutubeKey: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const checkKeys = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/status");
      if (res.ok) {
        const data = await res.json();
        setKeysStatus(data);
      }
    } catch (err) {
      console.error("Failed to check status keys:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkKeys();
  }, []);

  return (
    <header className="bg-zinc-950/40 border-b border-zinc-800/80 px-8 py-4 flex items-center justify-between sticky top-0 backdrop-blur-md z-10">
      <div>
        <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">ยินดีต้อนรับ</h2>
        <h1 className="text-lg font-bold text-white tracking-tight">Advice Content Intelligence Engine</h1>
      </div>

      <div className="flex items-center space-x-3">
        {loading ? (
          <div className="flex items-center space-x-2 text-zinc-500 text-xs">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>กำลังตรวจสอบสิทธิ์การใช้งาน API...</span>
          </div>
        ) : keysStatus ? (
          <div className="flex items-center space-x-2">
            {/* Gemini Key Status */}
            {keysStatus.hasGeminiKey ? (
              <span className="flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Gemini API: พร้อม</span>
              </span>
            ) : (
              <span className="flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Gemini API: ขาดการเชื่อมต่อ (.env.local)</span>
              </span>
            )}

            {/* YouTube Key Status */}
            {keysStatus.hasYoutubeKey ? (
              <span className="flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>YouTube API: พร้อม</span>
              </span>
            ) : (
              <span className="flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>YouTube API: ขาดการเชื่อมต่อ (.env.local)</span>
              </span>
            )}
          </div>
        ) : null}
      </div>
    </header>
  );
}
export default Header;
