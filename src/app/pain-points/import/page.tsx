"use client";

import { useState, useEffect } from "react";
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
  Info,
  Search,
  Calendar,
  Wrench,
  Download,
  CheckCheck
} from "lucide-react";

interface Ticket {
  machine_no: string;
  work_dtl_id: string;
  cuscode8: string;
  register_time: string;
  regis_date: string;
  cusname: string;
  amount: number;
  regis_name: string;
  technician_receive_name: string;
  job_status_name: string;
  imported?: boolean; // Already imported to DB
}

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
  const [activeTab, setActiveTab] = useState<"list" | "paste" | "url">("list");
  
  // Date range selectors (defaulting to last 14 days)
  const getInitialDates = () => {
    const today = new Date();
    const ago = new Date();
    ago.setDate(today.getDate() - 14);
    
    const toHtml = (d: Date) => d.toISOString().split("T")[0];
    return {
      start: toHtml(ago),
      end: toHtml(today)
    };
  };

  const initialDates = getInitialDates();
  const [startDate, setStartDate] = useState(initialDates.start);
  const [endDate, setEndDate] = useState(initialDates.end);
  
  // Tickets list states
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loadingList, setLoadingList] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  // Manual inputs
  const [urlInput, setUrlInput] = useState("");
  const [rawContentInput, setRawContentInput] = useState("");

  // Scraper states
  const [parsing, setParsing] = useState(false);
  const [parsingTicketId, setParsingTicketId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [parsedResult, setParsedResult] = useState<ParsedData | null>(null);

  // Batch import state
  const [batchImporting, setBatchImporting] = useState(false);
  const [batchSummary, setBatchSummary] = useState<{ imported: number; skipped: number; errors: number } | null>(null);

  // Convert HTML date format (YYYY-MM-DD) to NESCEN format (DD/MM/YYYY)
  const formatHtmlDateToNescen = (dateStr: string) => {
    if (!dateStr) return "";
    const [year, month, day] = dateStr.split("-");
    return `${day}/${month}/${year}`;
  };

  // Fetch tickets list from NESCEN
  const fetchTicketsList = async () => {
    try {
      setLoadingList(true);
      setListError(null);
      setTickets([]);
      setFilteredTickets([]);

      const queryParams = new URLSearchParams({
        startDate: formatHtmlDateToNescen(startDate),
        endDate: formatHtmlDateToNescen(endDate)
      });

      const res = await fetch(`/api/scrape-repairs?${queryParams.toString()}`);
      const json = await res.json();

      if (res.ok && json.success) {
        setTickets(json.tickets || []);
      } else {
        setListError(json.error || "ไม่สามารถเชื่อมต่อระบบใบส่งซ่อมของร้านได้");
      }
    } catch (err: any) {
      console.error(err);
      setListError("เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่ายร้านซ่อม");
    } finally {
      setLoadingList(false);
    }
  };

  // Filter tickets when search term changes
  useEffect(() => {
    if (activeTab === "list") {
      let result = [...tickets];
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        result = result.filter(
          (t) =>
            t.work_dtl_id.toLowerCase().includes(term) ||
            t.cusname.toLowerCase().includes(term) ||
            (t.technician_receive_name && t.technician_receive_name.toLowerCase().includes(term))
        );
      }
      setFilteredTickets(result);
    }
  }, [tickets, searchTerm, activeTab]);

  // Load tickets on component mount & when dates change
  useEffect(() => {
    if (activeTab === "list") {
      fetchTicketsList();
    }
  }, [startDate, endDate, activeTab]);

  // Batch import: import all non-imported tickets in view
  const handleBatchImport = async () => {
    const toImport = filteredTickets.filter(t => !t.imported);
    if (toImport.length === 0) return;
    setBatchImporting(true);
    setBatchSummary(null);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/scrape-repairs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "batchImport", tickets: toImport }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setBatchSummary(json.summary);
        // Refresh ticket list to update imported flags
        await fetchTicketsList();
      } else {
        setErrorMsg(json.error || "เกิดข้อผิดพลาดในการนำเข้าแบบกลุ่ม");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("เกิดข้อผิดพลาดในการเชื่อมต่อระบบ");
    } finally {
      setBatchImporting(false);
    }
  };

  // Scrape a specific ticket by clicking "Import" from list
  const handleImportTicket = async (ticket: Ticket) => {
    setErrorMsg(null);
    setParsedResult(null);
    setParsingTicketId(ticket.work_dtl_id);
    setParsing(true);

    try {
      const res = await fetch("/api/scrape-repairs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "fetchDetail",
          workDtlId: ticket.work_dtl_id,
          machineNo: ticket.machine_no,
          cus8: ticket.cuscode8,
          cusname: ticket.cusname
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setParsedResult(json.data);
      } else {
        setErrorMsg(json.error || `ไม่สามารถดึงรายละเอียดใบส่งซ่อม ${ticket.work_dtl_id} ได้`);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("ไม่สามารถดึงรายละเอียดได้เนื่องจากข้อผิดพลาดเครือข่าย");
    } finally {
      setParsing(false);
      setParsingTicketId(null);
    }
  };

  // Handle manual imports (pasted text/HTML or URL)
  const handleManualImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setParsedResult(null);
    setParsing(true);

    const payload: any = {};
    if (activeTab === "url") {
      if (!urlInput.trim()) return;
      payload.url = urlInput.trim();
    } else {
      if (!rawContentInput.trim()) return;
      payload.action = "parsePasted";
      payload.rawContent = rawContentInput.trim();
    }

    try {
      const res = await fetch("/api/scrape-repairs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setParsedResult(json.data);
      } else {
        setErrorMsg(json.error || "ไม่สามารถวิเคราะห์ข้อมูลงานซ่อมคอมพิวเตอร์ได้");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg("เกิดข้อผิดพลาดในการรับข้อมูลจากเซิร์ฟเวอร์");
    } finally {
      setParsing(false);
    }
  };

  // Save parsed Pain Point to database
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
    <div className="space-y-6 max-w-7xl">
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
        <span className="text-white text-sm font-semibold">นำเข้าข้อมูลใบสั่งซ่อม</span>
      </div>

      <div className="space-y-2">
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
          <Sparkles className="w-5 h-5 text-blue-400" />
          <span>ระบบนำเข้าเคสซ่อมด้วย AI (NESCEN / Advice Scraper)</span>
        </h1>
        <p className="text-xs text-zinc-400 font-medium">
          ดึงข้อมูลอุปกรณ์ที่ลงทะเบียนในระบบร้านซ่อมโดยอัตโนมัติ สแกนความเห็นช่างและอาการเครื่อง เพื่อนำมาสร้างบทพูดวิดีโอ Reels/Shorts สรุปเคสซ่อมประจำวัน
        </p>
      </div>

      {/* Tabs Selector */}
      <div className="flex border-b border-zinc-800 pb-px w-full max-w-md">
        <button
          onClick={() => { setActiveTab("list"); setErrorMsg(null); }}
          className={`flex-1 pb-3 text-xs font-bold transition-all border-b-2 flex items-center justify-center space-x-2 cursor-pointer ${
            activeTab === "list"
              ? "border-blue-500 text-white"
              : "border-transparent text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <Wrench className="w-4 h-4" />
          <span>รายการงานซ่อมในร้าน</span>
        </button>
        <button
          onClick={() => { setActiveTab("paste"); setErrorMsg(null); }}
          className={`flex-1 pb-3 text-xs font-bold transition-all border-b-2 flex items-center justify-center space-x-2 cursor-pointer ${
            activeTab === "paste"
              ? "border-blue-500 text-white"
              : "border-transparent text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <Clipboard className="w-4 h-4" />
          <span>วาง HTML / ข้อความ</span>
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
          <span>ดึงผ่านลิงก์</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Input methods */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* TAB 1: Live tickets list from NESCEN */}
          {activeTab === "list" && (
            <div className="glass-panel p-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-4">
              {/* Date Filters, Search & Batch Import */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                  <div className="flex items-center space-x-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:flex-none">
                      <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                      />
                    </div>
                    <span className="text-zinc-650 text-xs font-bold">ถึง</span>
                    <div className="relative flex-1 sm:flex-none">
                      <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                      />
                    </div>
                  </div>

                  <div className="relative w-full sm:w-52">
                    <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-zinc-500" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="ค้นตามชื่องานซ่อม/ลูกค้า..."
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-zinc-300 placeholder-zinc-500 focus:outline-none focus:border-blue-600"
                    />
                  </div>
                </div>

                {/* Batch Import Bar */}
                {filteredTickets.length > 0 && (
                  <div className="flex items-center justify-between bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5">
                    <div className="text-[11px] text-zinc-400 font-medium">
                      <span className="text-white font-bold">{filteredTickets.filter(t => !t.imported).length}</span> ใบที่ยังไม่ได้นำเข้า
                      {filteredTickets.filter(t => t.imported).length > 0 && (
                        <span className="ml-2 text-emerald-500">· <CheckCheck className="inline w-3 h-3" /> {filteredTickets.filter(t => t.imported).length} นำเข้าแล้ว</span>
                      )}
                    </div>
                    <button
                      onClick={handleBatchImport}
                      disabled={batchImporting || filteredTickets.filter(t => !t.imported).length === 0}
                      className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-900 disabled:text-zinc-600 active:scale-[0.97] text-[11px] font-bold text-white border border-violet-500/30 transition-all cursor-pointer"
                    >
                      {batchImporting ? (
                        <><RefreshCw className="w-3 h-3 animate-spin" /><span>กำลังนำเข้าทั้งหมด...</span></>
                      ) : (
                        <><Download className="w-3 h-3" /><span>นำเข้าทั้งหมด ({filteredTickets.filter(t => !t.imported).length} ใบ)</span></>
                      )}
                    </button>
                  </div>
                )}

                {/* Batch summary toast */}
                {batchSummary && (
                  <div className="flex items-center space-x-2 bg-emerald-950/30 border border-emerald-800/40 rounded-xl px-4 py-2.5 text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-emerald-300 font-semibold">
                      นำเข้าสำเร็จ {batchSummary.imported} ใบ
                      {batchSummary.skipped > 0 && ` · ข้ามแล้ว ${batchSummary.skipped} ใบ`}
                      {batchSummary.errors > 0 && ` · ผิดพลาด ${batchSummary.errors} ใบ`}
                    </span>
                  </div>
                )}
              </div>

              {/* Tickets Table List */}
              {loadingList ? (
                /* Cockpit Table Skeleton Loader */
                <div className="space-y-3 animate-pulse">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-12 bg-zinc-950 border border-zinc-850 rounded-xl flex items-center justify-between px-4">
                      <div className="flex space-x-3 w-1/3">
                        <div className="h-4 w-24 bg-zinc-800 rounded" />
                        <div className="h-4 w-16 bg-zinc-850 rounded" />
                      </div>
                      <div className="h-4 w-32 bg-zinc-800 rounded w-1/4" />
                      <div className="h-4 w-12 bg-zinc-800 rounded w-1/12" />
                      <div className="h-8 w-20 bg-zinc-850 rounded-lg" />
                    </div>
                  ))}
                </div>
              ) : listError ? (
                <div className="flex flex-col items-center justify-center py-10 text-center bg-zinc-950 rounded-2xl border border-zinc-800 space-y-3">
                  <AlertCircle className="w-8 h-8 text-amber-500" />
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-zinc-300">{listError}</p>
                    <p className="text-[10px] text-zinc-500 max-w-md">ระบบไม่สามารถดึงข้อมูลจากหลังบ้านได้เนื่องจากการเชื่อมต่อหรือล็อกอินหมดอายุ กรุณาตรวจสอบ หรือใช้วิธีนำเข้าแบบ "วาง HTML / ข้อความ" แทน</p>
                  </div>
                  <button 
                    onClick={fetchTicketsList}
                    className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-zinc-850 hover:bg-zinc-800 border border-zinc-800 active:scale-[0.98] text-xs font-bold text-white transition-all cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>ลองใหม่อีกครั้ง</span>
                  </button>
                </div>
              ) : filteredTickets.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-zinc-900 border-b border-zinc-850 text-zinc-400 font-bold uppercase tracking-wider">
                        <th className="p-3">เลขที่งานซ่อม</th>
                        <th className="p-3">วันที่</th>
                        <th className="p-3">ชื่อลูกค้า</th>
                        <th className="p-3">ยอดค่าใช้จ่าย</th>
                        <th className="p-3">สถานะงาน</th>
                        <th className="p-3 text-center">ดำเนินการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900">
                      {filteredTickets.map((t) => (
                        <tr key={t.work_dtl_id} className={`text-zinc-300 font-medium transition-colors ${ t.imported ? "bg-emerald-950/10" : "hover:bg-zinc-900/40" }`}>
                          <td className="p-3 font-mono font-bold text-blue-400">{t.work_dtl_id}</td>
                          <td className="p-3 text-zinc-500 font-semibold">{t.regis_date}</td>
                          <td className="p-3 font-bold">{t.cusname}</td>
                          <td className="p-3 font-bold text-zinc-400 font-mono">฿{t.amount.toLocaleString()}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-[4px] text-[10px] font-bold border ${
                              t.job_status_name === "Complete"
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                            }`}>
                              {t.job_status_name === "Complete" ? "เสร็จสิ้น" : t.job_status_name}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            {t.imported ? (
                              <span className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-emerald-950/40 text-[11px] font-bold text-emerald-400 border border-emerald-800/30">
                                <CheckCheck className="w-3 h-3" />
                                <span>นำเข้าแล้ว</span>
                              </span>
                            ) : (
                              <button
                                onClick={() => handleImportTicket(t)}
                                disabled={parsing || batchImporting}
                                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-900 disabled:text-zinc-650 active:scale-[0.98] disabled:scale-100 text-[11px] font-bold text-white border border-blue-500/20 transition-all cursor-pointer"
                              >
                                {parsingTicketId === t.work_dtl_id ? (
                                  <RefreshCw className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Sparkles className="w-3 h-3" />
                                )}
                                <span>นำเข้าด้วย AI</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center bg-zinc-950 rounded-2xl border border-zinc-800/80">
                  <FileText className="w-8 h-8 text-zinc-700 mb-2" />
                  <p className="text-xs font-bold text-zinc-500">ไม่พบข้อมูลใบสั่งซ่อมในช่วงเวลาที่เลือก</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2 & 3: Manual paste and legacy URL form */}
          {activeTab !== "list" && (
            <div className="glass-panel p-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-4">
              <form onSubmit={handleManualImport} className="space-y-4">
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
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-xs text-zinc-200 placeholder-zinc-650 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all font-mono"
                    />
                    <div className="flex items-start space-x-2 bg-zinc-950 p-3 rounded-xl border border-zinc-850">
                      <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                      <div className="text-[10px] text-zinc-400 leading-normal">
                        <p className="font-bold text-zinc-300">💡 คำแนะนำในการทำงาน:</p>
                        เปิดหน้างานซ่อมในระบบ NESCEN จากนั้นลากคลุมข้อความรายละเอียดทั้งหมด (ชื่อลูกค้า ยี่ห้อ อาการเสีย และอะไหล่) คัดลอกมาวางที่นี่ได้เลย AI จะคัดแยกจัดระเบียบให้ทันที
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
                      placeholder="เช่น https://branch.nescen.in.th/55000067/index.php/shop/branch_service/repairhistory/WD2605034319"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-xs text-zinc-200 placeholder-zinc-650 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all"
                    />
                    <div className="flex items-start space-x-2 bg-amber-950/20 border border-amber-900/40 p-3 rounded-xl">
                      <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <div className="text-[10px] text-amber-450 leading-normal">
                        <span className="font-bold">หมายเหตุสำคัญ:</span> เนื่องจากเว็บสาขามีระบบรักษาความปลอดภัยสูง ลิงก์ตรงอาจจะปฏิเสธการเชื่อมต่อของเซิร์ฟเวอร์ภายนอก แนะนำให้เปิดแท็บ <span className="underline font-semibold cursor-pointer text-blue-400" onClick={() => setActiveTab("list")}>"รายการงานซ่อมในร้าน"</span> เพื่อคลิกนำเข้าจากตารางได้สะดวกและเร็วที่สุด
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
                      <span>กำลังประมวลผลวิเคราะห์ด้วย AI...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>ดึงและวิเคราะห์ข้อมูลด้วย AI</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {errorMsg && (
            <div className="flex items-start space-x-2.5 bg-red-950/20 border border-red-900/45 p-3.5 rounded-xl text-xs text-red-400 whitespace-pre-line">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="font-medium">{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Right Column: AI Extraction Preview & Save */}
        <div className="lg:col-span-5">
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
                <h2 className="text-sm font-bold text-white">ผลการถอดรหัสงานซ่อมคอมพิวเตอร์</h2>
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
                      className="w-full bg-zinc-950 border border-zinc-805 rounded-xl px-3.5 py-2 text-xs text-zinc-200 focus:outline-none focus:border-blue-600 transition-all font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                      อาการเสียเครื่อง
                    </label>
                    <input
                      type="text"
                      required
                      value={parsedResult.symptoms}
                      onChange={(e) => setParsedResult({ ...parsedResult, symptoms: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-805 rounded-xl px-3.5 py-2 text-xs text-zinc-200 focus:outline-none focus:border-blue-600 transition-all font-semibold"
                    />
                  </div>
                </div>

                {/* Combined Raw Text */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                    คำอธิบายเคสสำหรับเข้าคลัง (Raw Text)
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={parsedResult.rawText}
                    onChange={(e) => setParsedResult({ ...parsedResult, rawText: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-805 rounded-xl px-3.5 py-2.5 text-xs text-zinc-200 focus:outline-none focus:border-blue-600 transition-all font-medium leading-relaxed"
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
                      className="w-full bg-zinc-950 border border-zinc-805 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-blue-600 transition-all cursor-pointer"
                    >
                      <option value="low">ต่ำ (ปกติ)</option>
                      <option value="medium">กลาง (ปานกลาง)</option>
                      <option value="high">สูง (คอมพัง/รีบใช้ด่วน)</option>
                    </select>
                  </div>

                  {/* Customer Type */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                      ประเภทลูกค้า
                    </label>
                    <input
                      type="text"
                      value={parsedResult.customerType}
                      onChange={(e) => setParsedResult({ ...parsedResult, customerType: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-805 rounded-xl px-3.5 py-2 text-xs text-zinc-200 focus:outline-none focus:border-blue-600 transition-all"
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
                    className="w-full bg-zinc-950 border border-zinc-805 rounded-xl px-3.5 py-2 text-xs text-zinc-200 focus:outline-none focus:border-blue-600 transition-all font-semibold"
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
            <div className="flex flex-col items-center justify-center h-full min-h-[350px] bg-zinc-900/10 border border-dashed border-zinc-850 rounded-2xl p-6 text-center">
              <FileText className="w-10 h-10 text-zinc-700 mb-3" />
              <h3 className="text-sm font-bold text-zinc-400">รอรับข้อมูลการถอดรหัส</h3>
              <p className="text-[11px] text-zinc-500 max-w-xs mt-1">
                คลิกเลือก "นำเข้าด้วย AI" บนรายการงานซ่อม หรือ วางข้อมูลในแท็บซ้ายมือเพื่อจำลองเคสซ่อมได้ทันที
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
