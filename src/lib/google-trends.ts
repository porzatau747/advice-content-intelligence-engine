import xml2js from "xml2js";

export interface GoogleTrendsResult {
  title: string;
  traffic: string;
  description: string;
  sourceUrl: string;
  relatedKeywords: string[];
}

/**
 * Fetches the daily Google Trends RSS feed for Thailand (geo=TH)
 */
export async function fetchGoogleTrends(): Promise<GoogleTrendsResult[]> {
  const url = "https://trends.google.com/trending/rss?geo=TH";

  try {
    const response = await fetch(url, {
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Google Trends RSS: ${response.statusText}`);
    }

    const xmlText = await response.text();
    const parser = new xml2js.Parser({ explicitArray: false });
    const result = await parser.parseStringPromise(xmlText);

    const rawItems = result?.rss?.channel?.item;
    if (!rawItems) {
      return [];
    }

    // Normalize to array since xml2js explicitArray: false returns single object if only 1 item
    const items = Array.isArray(rawItems) ? rawItems : [rawItems];

    return items.map((item: any) => {
      const title = item.title || "";
      
      // Google Trends RSS namespace fields for traffic and news items
      // xml2js represents namespaces as "ht:approx_traffic" or similar keys
      const traffic = item["ht:approx_traffic"] || "";
      const link = item.link || `https://trends.google.com/trends/trendingsearches/daily?geo=TH`;
      
      // Get related news article description
      let description = "";
      const newsItem = item["ht:news_item"];
      if (newsItem) {
        // If multiple news items, take first one
        const primaryNews = Array.isArray(newsItem) ? newsItem[0] : newsItem;
        const newsTitle = primaryNews["ht:news_item_title"] || "";
        const newsSnippet = primaryNews["ht:news_item_snippet"] || "";
        description = `${newsTitle}: ${newsSnippet}`;
      } else {
        description = item.description || "";
      }

      // Related queries / keywords
      let relatedKeywords: string[] = [];
      const pictureSource = item["ht:picture_source"] || "";
      if (pictureSource) {
        relatedKeywords.push(pictureSource);
      }
      
      // Clean up title (Google Trends includes search query)
      const cleanTitle = title.trim();

      return {
        title: cleanTitle,
        traffic: String(traffic).trim(),
        description: description.substring(0, 300),
        sourceUrl: link,
        relatedKeywords,
      };
    });
  } catch (error: any) {
    console.error("Google Trends Feed Fetch Error:", error);
    throw new Error(error?.message || "Failed to fetch daily Google Trends from RSS Feed.");
  }
}
