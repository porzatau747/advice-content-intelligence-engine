import { NextResponse } from "next/server";
import { searchTechVideos } from "@/lib/youtube";

// GET /api/external-signals/fetch-youtube?q=...
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "แก้ปัญหาคอม";

    if (!process.env.YOUTUBE_API_KEY) {
      return NextResponse.json(
        { error: "YouTube API Key is not configured. Please add YOUTUBE_API_KEY to your .env.local file." },
        { status: 400 }
      );
    }

    const videos = await searchTechVideos(query);
    return NextResponse.json(videos);
  } catch (error: any) {
    console.error("YouTube Fetch API Route Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch videos from YouTube." },
      { status: 500 }
    );
  }
}
