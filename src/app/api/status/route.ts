import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    hasGeminiKey: !!process.env.GEMINI_API_KEY,
    hasYoutubeKey: !!process.env.YOUTUBE_API_KEY,
  });
}
