"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  MessageSquarePlus, 
  MessageSquare, 
  Rss, 
  BookOpen, 
  FileText, 
  Video 
} from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "เพิ่มปัญหาหน้าร้าน", href: "/pain-points/new", icon: MessageSquarePlus },
    { name: "ปัญหาหน้าร้านทั้งหมด", href: "/pain-points", icon: MessageSquare },
    { name: "สัญญาณภายนอก (API)", href: "/external-signals", icon: Rss },
    { name: "คลัง Story Formats", href: "/story-formats", icon: BookOpen },
    { name: "Daily Brief ประจำวัน", href: "/daily-brief", icon: FileText },
  ];

  return (
    <aside className="w-64 bg-zinc-950 border-r border-zinc-800/80 flex flex-col h-screen sticky top-0">
      {/* Brand Header */}
      <div className="p-6 border-b border-zinc-800/80 flex items-center space-x-3">
        <div className="bg-blue-600 p-2 rounded-xl text-white">
          <Video className="w-6 h-6" />
        </div>
        <div>
          <h1 className="font-bold text-lg text-white tracking-tight leading-none">Advice</h1>
          <span className="text-xs text-blue-400 font-semibold">สามร้อยยอด Content</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 active:scale-[0.98] ${
                isActive
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/10 border border-blue-500"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-white border border-transparent"
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? "text-white" : "text-zinc-400"}`} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Sidebar Footer */}
      <div className="p-4 border-t border-zinc-800/80">
        <div className="bg-zinc-900/50 p-3 rounded-xl border border-zinc-800/60">
          <p className="text-xs text-zinc-500 font-medium">สถานะระบบ</p>
          <div className="flex items-center space-x-2 mt-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-bold text-zinc-300">Local-First (Active)</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
export default Sidebar;
