"use client";

import { useEffect, useState } from "react";
import { BookOpen, RefreshCw, Sparkles, Film, AlignLeft, Info } from "lucide-react";

interface StoryFormat {
  id: string;
  name: string;
  structure: string;
  exampleHook: string;
  recommendedShotStyle: string;
}

export default function StoryFormats() {
  const [formats, setFormats] = useState<StoryFormat[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFormats = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/story-formats");
      if (res.ok) {
        const data = await res.json();
        setFormats(data);
      }
    } catch (error) {
      console.error("Failed to fetch formats:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFormats();
  }, []);

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Title */}
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
          <BookOpen className="w-5 h-5 text-blue-400" />
          <span>คลังรูปแบบการเล่าเรื่อง (Story Format Library)</span>
        </h1>
        <p className="text-xs text-zinc-400 font-medium">
          คลังฟอร์แมตโครงสร้างวิดีโอสั้นที่ได้รับการพิสูจน์แล้วว่าเหมาะสำหรับร้านค้าปลีกไอทีและงานซ่อมหน้าร้าน 
          ช่วยแปลงข้อมูลปัญหาดิบให้เป็นวิดีโอที่เล่าง่ายด้วยคนๆ เดียว
        </p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <RefreshCw className="w-7 h-7 text-blue-600 animate-spin" />
          <p className="text-xs text-zinc-400 font-medium">กำลังโหลดคลังรูปแบบการเล่าเรื่อง...</p>
        </div>
      ) : formats.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {formats.map((format) => (
            <div key={format.id} className="glass-panel p-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 flex flex-col justify-between space-y-4 hover:border-zinc-700 transition-all duration-300">
              <div className="space-y-3">
                <div className="flex items-center space-x-2 pb-2 border-b border-zinc-800">
                  <span className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    <Film className="w-4 h-4" />
                  </span>
                  <h3 className="font-bold text-sm text-white tracking-tight">{format.name}</h3>
                </div>
                
                {/* Structure */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex items-center space-x-1">
                    <AlignLeft className="w-3.5 h-3.5 text-zinc-500" />
                    <span>โครงสร้าง (Structure):</span>
                  </span>
                  <p className="text-xs text-zinc-200 leading-relaxed font-bold">
                    {format.structure}
                  </p>
                </div>

                {/* Example Hook */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center space-x-1">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                    <span>ตัวอย่าง Hook เปิดคลิป:</span>
                  </span>
                  <p className="text-xs text-zinc-200 font-semibold bg-zinc-950 p-2.5 rounded-lg border border-zinc-800">
                    "{format.exampleHook}"
                  </p>
                </div>
              </div>

              {/* Recommended Shot Style */}
              <div className="pt-3 border-t border-zinc-800 space-y-1">
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider flex items-center space-x-1">
                  <Info className="w-3.5 h-3.5 text-blue-400" />
                  <span>สไตล์ช็อตถ่ายหน้าร้าน:</span>
                </span>
                <p className="text-[11px] text-zinc-500 leading-relaxed">
                  {format.recommendedShotStyle}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-panel p-12 text-center text-zinc-500 text-xs border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/40 font-medium">
          ไม่พบข้อมูล Story Format กรุณากดรัน Seed ข้อมูลในขั้นตอนเตรียมระบบเพื่อเปิดใช้งาน
        </div>
      )}
    </div>
  );
}
