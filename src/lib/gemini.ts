import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini Client
const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// Default model requested: Gemini 2.5 Flash
const DEFAULT_MODEL = "gemini-2.5-flash";

/**
 * Helper to generate JSON content from Gemini
 */
export async function generateJSON<T>(prompt: string, modelName: string = DEFAULT_MODEL): Promise<T> {
  if (!genAI) {
    throw new Error(
      "GEMINI_API_KEY is not configured. Please set the GEMINI_API_KEY environment variable in your .env.local file."
    );
  }

  try {
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    if (!text) {
      throw new Error("No response received from Gemini AI.");
    }

    // Parse clean JSON
    return JSON.parse(text) as T;
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    // Enhance error messages for missing keys or quotas
    if (error?.status === 403 || error?.message?.includes("API key")) {
      throw new Error("Invalid Gemini API key. Please check your GEMINI_API_KEY in .env.local");
    }
    if (error?.status === 429 || error?.message?.includes("Quota")) {
      throw new Error("Gemini API Rate Limit exceeded. Please try again later.");
    }
    throw new Error(error?.message || "Failed to generate content from Gemini AI.");
  }
}
