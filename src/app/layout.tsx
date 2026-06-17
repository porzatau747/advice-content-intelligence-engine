import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Advice Content Intelligence Engine",
  description: "ระบบช่วยคิดคอนเทนต์และสร้างวิดีโอสั้นหน้าร้านจากปัญหาจริงของลูกค้า สำหรับร้าน Advice สามร้อยยอด",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="th"
      className={`${geistSans.variable} ${geistMono.variable} h-full dark`}
      style={{ colorScheme: "dark" }}
    >
      <body className="h-full bg-zinc-950 text-zinc-100 flex overflow-hidden">
        {/* Sidebar Nav */}
        <Sidebar />

        {/* Main Workspace */}
        <div className="flex-1 flex flex-col h-screen overflow-hidden">
          {/* Header */}
          <Header />

          {/* Page Body */}
          <main className="flex-1 overflow-y-auto p-8 bg-zinc-900/10">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
