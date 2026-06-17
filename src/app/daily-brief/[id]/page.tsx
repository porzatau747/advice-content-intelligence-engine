"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { 
  FileText, 
  ArrowLeft, 
  Copy, 
  Check, 
  Sparkles, 
  Film, 
  Video, 
  Layers, 
  AlertTriangle,
  RefreshCw,
  Info
} from "lucide-react";

interface StoryFormat {
  name: string;
  structure: string;
  recommendedShotStyle: string;
}

interface ClipIdea {
  id: string;
  title: string;
  hook: string;
  selectedStoryFormat: StoryFormat;
  shotList: string; // JSON string array
  onScreenText: string;
  voiceOver: string;
  capcutStyle: string;
  caption: string;
  hashtags: string;
  difficulty: "easy" | "medium" | "hard";
  cta: string;
  verificationNeeded: boolean;
  contentGoal: "educate" | "product_conversion" | "repair_service";
  whyThisClipMatters: string;
}

interface DailyBrief {
  id: string;
  briefDate: string;
  summary: string;
  customerInsight: string;
  clipIdeas: ClipIdea[];
}

interface PageProps {
  params: Promise<{ id: string }>;
}

function BriefDetailSkeleton() {
  return (
    <div className="space-y-8 max-w-5xl animate-pulse">
      <div className="flex justify-between items-center">
        <div className="h-6 w-32 bg-zinc-900 rounded" />
        <div className="h-10 w-48 bg-zinc-900 rounded-xl" />
      </div>
      <div className="glass-panel p-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-3">
        <div className="h-5 w-24 bg-zinc-800 rounded-full" />
        <div className="h-6 w-3/4 bg-zinc-800 rounded" />
        <div className="h-4 w-5/6 bg-zinc-850 rounded" />
      </div>
      <div className="space-y-6">
        <div className="h-5 w-32 bg-zinc-900 rounded" />
        <div className="space-y-6">
          {[...Array(2)].map((_, idx) => (
            <div key={idx} className="glass-panel p-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-4">
              <div className="h-8 w-full bg-zinc-900/50 rounded-xl border border-zinc-800/80" />
              <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                <div className="md:col-span-2 space-y-3">
                  <div className="h-12 bg-zinc-900 rounded-xl" />
                  <div className="h-20 bg-zinc-900 rounded-xl" />
                </div>
                <div className="md:col-span-3 h-48 bg-zinc-950/60 border border-zinc-800 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function DailyBriefViewer({ params }: PageProps) {
  const { id } = use(params);
  const [brief, setBrief] = useState<DailyBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedBrief, setCopiedBrief] = useState(false);
  const [copiedClipId, setCopiedClipId] = useState<string | null>(null);

  const fetchBrief = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/daily-brief/${id}`);
      if (res.ok) {
        const data = await res.json();
        setBrief(data);
      }
    } catch (error) {
      console.error("Failed to fetch brief:", error);
    } finally {
      setLoading(false);
    }
  };

  const copyBriefAsMarkdown = () => {
    if (!brief) return;

    let md = `# ใบสั่งถ่ายวิดีโอประจำวัน (Daily Brief)\n`;
    md += `**วันที่:** ${new Date(brief.briefDate).toLocaleDateString("th-TH")}\n`;
    md += `**สรุปแนวคิดหลัก:** ${brief.summary}\n`;
    md += `**ข้อมูลเชิงลึกความกลัวลูกค้า:** ${brief.customerInsight}\n\n`;
    md += `--------------------------------------------------\n\n`;

    brief.clipIdeas.forEach((clip, idx) => {
      const goalThai = clip.contentGoal === "educate" 
        ? "1. คลิปให้ความรู้/ทิป (Educate Clip)" 
        : clip.contentGoal === "product_conversion" 
        ? "2. คลิปแนะนำสินค้าเพื่อปิดการขาย (Product Sell Clip)" 
        : "3. คลิปแนะนำงานซ่อมหน้าร้าน (Repair Service Clip)";

      const shots: string[] = JSON.parse(clip.shotList);

      md += `## ${goalThai}: ${clip.title}\n`;
      md += `- **ระดับความยากในการถ่าย:** ${clip.difficulty === "easy" ? "ง่าย (คนเดียวสบาย)" : clip.difficulty === "medium" ? "ปานกลาง" : "ยาก (อาจต้องการคนช่วยกล้อง)"}\n`;
      if (clip.verificationNeeded) {
        md += `- **⚠️ [คำเตือนสำคัญ: ต้องตรวจสอบข้อมูลสเปค/สต๊อกจริงหน้าร้านก่อนถ่ายทำ]**\n`;
      }
      md += `- **รูปแบบการเล่าเรื่อง (Story Format):** ${clip.selectedStoryFormat.name}\n`;
      md += `  *โครงสร้าง: ${clip.selectedStoryFormat.structure}*\n`;
      md += `- **วินาทีหยุดคนดู (Hook 3 วิแรก):** "${clip.hook}"\n`;
      md += `- **ข้อความขึ้นจอ (On-screen text):** ${clip.onScreenText}\n`;
      md += `- **บทพูดเสียงบรรยาย (Voice-over Script):**\n  ${clip.voiceOver}\n\n`;
      md += `- **ลำดับมุมกล้องที่ต้องถ่าย (Shot List):**\n`;
      shots.forEach((shot, sIdx) => {
        md += `  ${sIdx + 1}. [ ] ${shot}\n`;
      });
      md += `\n- **สไตล์การตัดต่อ CapCut:** ${clip.capcutStyle}\n`;
      md += `- **แคปชั่นโพสต์โซเชียล:**\n\`\`\`\n${clip.caption}\n${clip.hashtags}\n\`\`\`\n\n`;
      md += `--------------------------------------------------\n\n`;
    });

    navigator.clipboard.writeText(md);
    setCopiedBrief(true);
    setTimeout(() => setCopiedBrief(false), 2000);
  };

  const copyClipScript = (clip: ClipIdea) => {
    const shots: string[] = JSON.parse(clip.shotList);
    let txt = `🎬 หัวข้อ: ${clip.title}\n`;
    txt += `🪝 Hook 3 วิแรก: "${clip.hook}"\n\n`;
    txt += `📝 บทพูด (Voice-over):\n${clip.voiceOver}\n\n`;
    txt += `📹 ลำดับมุมกล้องที่ต้องถ่าย:\n`;
    shots.forEach((shot, idx) => {
      txt += `${idx + 1}. ${shot}\n`;
    });
    txt += `\n💬 ข้อความขึ้นจอ: ${clip.onScreenText}\n`;
    txt += `⚙️ ตัดต่อ CapCut: ${clip.capcutStyle}\n\n`;
    txt += `📱 แคปชั่นโพสต์:\n${clip.caption}\n${clip.hashtags}`;

    navigator.clipboard.writeText(txt);
    setCopiedClipId(clip.id);
    setTimeout(() => setCopiedClipId(null), 2000);
  };

  useEffect(() => {
    fetchBrief();
  }, [id]);

  if (loading) {
    return <BriefDetailSkeleton />;
  }

  if (!brief) {
    return (
      <div className="text-center py-20 space-y-4">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
        <p className="text-sm text-zinc-500 font-medium">ไม่พบใบสั่งถ่ายวิดีโอนี้ในระบบ</p>
        <Link href="/daily-brief" className="text-blue-400 font-bold hover:underline">
          กลับไปหน้าประวัติ
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header breadcrumb */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center space-x-2">
          <Link 
            href="/daily-brief" 
            className="text-zinc-500 hover:text-white transition-colors p-2 hover:bg-zinc-800 rounded-xl active:scale-[0.98]"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <span className="text-zinc-500 text-sm">/</span>
          <span className="text-zinc-500 text-sm">ประวัติ Daily Brief</span>
          <span className="text-zinc-500 text-sm">/</span>
          <span className="text-white text-sm font-semibold">ดูรายละเอียด</span>
        </div>

        <button
          onClick={copyBriefAsMarkdown}
          className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-xs font-bold text-white border border-blue-500/20 transition-all cursor-pointer shadow-md shadow-blue-600/10"
        >
          {copiedBrief ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          <span>{copiedBrief ? "คัดลอกลงบอร์ดแล้ว!" : "คัดลอก Brief ทั้งหมด (Markdown)"}</span>
        </button>
      </div>

      {/* Brief Summary Dashboard */}
      <div className="glass-panel p-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-4">
        <div className="flex items-center space-x-1.5">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            Brief วันที่ {new Date(brief.briefDate).toLocaleDateString("th-TH", { day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-white">แนวคิดหลักประจำวันนี้: {brief.summary}</h2>
          <p className="text-sm text-zinc-400 leading-relaxed">
            <span className="font-bold text-zinc-300">จิตวิทยาที่ต้องเล่นเพื่อแก้ความกังวลลูกค้า (Insight):</span> {brief.customerInsight}
          </p>
        </div>
      </div>

      {/* 3 Clips Section */}
      <div className="space-y-6">
        <h3 className="text-base font-bold text-white tracking-tight flex items-center space-x-2">
          <Video className="w-5 h-5 text-blue-400" />
          <span>บทสคริปต์วิดีโอ 3 สไตล์สำหรับวันนี้</span>
        </h3>

        <div className="space-y-6">
          {brief.clipIdeas.map((clip, idx) => {
            const shots: string[] = JSON.parse(clip.shotList);
            const isGoalEducate = clip.contentGoal === "educate";
            const isGoalConversion = clip.contentGoal === "product_conversion";

            return (
              <div 
                key={clip.id} 
                className="glass-panel p-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-6 hover:border-zinc-700 transition-all"
              >
                {/* Clip Header */}
                <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
                  <div className="flex items-center space-x-2">
                    <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase border ${
                      isGoalEducate
                        ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                        : isGoalConversion
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                    }`}>
                      {isGoalEducate ? "Educate/Tips" : isGoalConversion ? "Product Sell" : "Repair Service"}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold text-zinc-400 border border-zinc-850`}>
                      ยากง่าย: {clip.difficulty === "easy" ? "ง่าย" : clip.difficulty === "medium" ? "กลาง" : "ยาก"}
                    </span>
                  </div>

                  <button
                    onClick={() => copyClipScript(clip)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 active:scale-[0.98] text-[10px] font-bold text-zinc-300 border border-zinc-700 transition-colors cursor-pointer"
                  >
                    {copiedClipId === clip.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedClipId === clip.id ? "ก๊อปแล้ว!" : "คัดลอกสคริปต์คลิปนี้"}</span>
                  </button>
                </div>

                {/* Warning message if validation needed */}
                {clip.verificationNeeded && (
                  <div className="flex items-start space-x-2 bg-amber-500/5 border border-amber-900/40 p-3 rounded-xl text-xs text-amber-400 leading-relaxed">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                    <span>
                      <span className="font-bold">⚠️ [ต้องตรวจสอบข้อมูลและสต๊อกจริงก่อนถ่ายทำ]</span>: 
                      สคริปต์นี้มีการระบุราคา สเปค หรือระยะเวลารับประกันสินค้า กรุณาตรวจสอบข้อมูลกับระบบสต๊อกหน้าร้านจริงเพื่อให้ข้อมูลที่ถูกต้องแก่คนดู
                    </span>
                  </div>
                )}

                {/* Grid for clip details */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                  {/* Left part: Hook, why this matters, caption */}
                  <div className="md:col-span-2 space-y-4">
                    {/* Story format */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">รูปแบบบท (Story Format):</span>
                      <p className="text-xs text-white font-bold">{clip.selectedStoryFormat.name}</p>
                      <p className="text-[11px] text-zinc-500 leading-relaxed font-medium">"{clip.selectedStoryFormat.structure}"</p>
                    </div>

                    {/* Hook */}
                    <div className="space-y-1 bg-zinc-950 p-3.5 rounded-xl border border-zinc-800/80">
                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">คำพูดเปิด 3 วินาทีแรก (Hook):</span>
                      <p className="text-xs font-bold text-zinc-100 leading-relaxed">"{clip.hook}"</p>
                    </div>

                    {/* Why it matters */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">ทำไมคลิปนี้ถึงเวิร์ก? (Psychology):</span>
                      <p className="text-xs text-zinc-300 leading-relaxed font-medium">{clip.whyThisClipMatters}</p>
                    </div>

                    {/* Social Caption */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">แคปชั่นและแฮชแท็กโพสต์:</span>
                      <pre className="text-[10px] text-zinc-300 bg-zinc-950 p-3 rounded-lg border border-zinc-800 font-sans whitespace-pre-wrap leading-relaxed font-medium">
                        {clip.caption}
                        {"\n"}
                        <span className="text-blue-400 font-bold">{clip.hashtags}</span>
                      </pre>
                    </div>
                  </div>

                  {/* Right part: Shot list, Script, CapCut */}
                  <div className="md:col-span-3 space-y-4 bg-zinc-950/60 p-4 rounded-xl border border-zinc-800/80">
                    {/* On-screen & Voice-over Script */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block">บทพูดและข้อความหน้าจอ (Full Script):</span>
                      <div className="space-y-1 text-xs border-l-2 border-blue-500/55 pl-3">
                        <p className="text-zinc-400 font-medium"><span className="font-bold">ข้อความเด่นขึ้นจอ:</span> {clip.onScreenText}</p>
                        <div className="text-zinc-200 text-sm font-bold leading-relaxed whitespace-pre-wrap pt-1.5">
                          {clip.voiceOver}
                        </div>
                      </div>
                    </div>

                    {/* Shot List */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">ลำดับภาพที่ต้องถ่ายหน้าร้าน (Shot List):</span>
                      <ul className="space-y-2">
                        {shots.map((shot, sIdx) => (
                          <li key={sIdx} className="flex items-start space-x-2 text-xs text-zinc-200 font-bold">
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-zinc-800 text-zinc-300 text-[10px] font-bold shrink-0 mt-0.5">
                              {sIdx + 1}
                            </span>
                            <span className="leading-relaxed mt-0.5">{shot}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* CapCut editing guide */}
                    <div className="pt-2 border-t border-zinc-800/60 space-y-1.5">
                      <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block flex items-center space-x-1">
                        <Film className="w-3.5 h-3.5 text-purple-400" />
                        <span>คู่มือการตัดต่อ CapCut:</span>
                      </span>
                      <p className="text-xs text-zinc-300 leading-relaxed font-medium">
                        {clip.capcutStyle}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
