import { google } from "googleapis";

const apiKey = process.env.YOUTUBE_API_KEY || "";

const youtube = apiKey
  ? google.youtube({
      version: "v3",
      auth: apiKey,
    })
  : null;

export interface YouTubeVideoResult {
  id: string;
  title: string;
  description: string;
  sourceUrl: string;
  metrics: {
    views?: string;
    likes?: string;
  };
  relatedKeywords: string[];
}

/**
 * Searches for popular tech shorts or tech tips in Thailand.
 */
export async function searchTechVideos(query: string = "แก้ปัญหาคอม"): Promise<YouTubeVideoResult[]> {
  if (!youtube) {
    throw new Error(
      "YOUTUBE_API_KEY is not configured. Please set the YOUTUBE_API_KEY environment variable in your .env.local file."
    );
  }

  try {
    // 1. Search for videos
    const searchResponse = await youtube.search.list({
      part: ["snippet"],
      q: query,
      maxResults: 6,
      regionCode: "TH",
      relevanceLanguage: "th",
      type: ["video"],
      videoDuration: "short", // Target Shorts
      order: "relevance", // Get relevant videos
    });

    const items = searchResponse.data.items || [];
    const videoIds = items.map((item) => item.id?.videoId).filter(Boolean) as string[];

    if (videoIds.length === 0) {
      return [];
    }

    // 2. Fetch video details to get view/like metrics
    const detailsResponse = await youtube.videos.list({
      part: ["statistics", "snippet"],
      id: videoIds,
    });

    const detailItems = detailsResponse.data.items || [];

    return detailItems.map((item) => {
      const id = item.id || "";
      const title = item.snippet?.title || "";
      const description = item.snippet?.description || "";
      const tags = item.snippet?.tags || [];
      const viewCount = item.statistics?.viewCount || undefined;
      const likeCount = item.statistics?.likeCount || undefined;

      return {
        id,
        title,
        description: description.substring(0, 300), // Limit size
        sourceUrl: `https://www.youtube.com/shorts/${id}`,
        metrics: {
          views: viewCount,
          likes: likeCount,
        },
        relatedKeywords: tags.slice(0, 5), // Keep top 5 tags
      };
    });
  } catch (error: any) {
    console.error("YouTube API Error:", error);
    if (error?.response?.status === 400 || error?.message?.includes("keyInvalid")) {
      throw new Error("Invalid YouTube API key. Please check your YOUTUBE_API_KEY in .env.local");
    }
    throw new Error(error?.message || "Failed to fetch tech videos from YouTube API.");
  }
}
