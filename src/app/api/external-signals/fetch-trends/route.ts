import { NextResponse } from "next/server";
import { fetchGoogleTrends } from "@/lib/google-trends";

// GET /api/external-signals/fetch-trends
export async function GET() {
  try {
    const trends = await fetchGoogleTrends();
    return NextResponse.json(trends);
  } catch (error: any) {
    console.error("Google Trends Fetch API Route Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch Google Trends RSS Feed." },
      { status: 500 }
    );
  }
}
