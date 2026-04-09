import OpenAI from "openai";

const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;

export function getOpenAIClient(): OpenAI | null {
  if (!apiKey?.trim()) return null;
  return new OpenAI({
    apiKey: apiKey.trim(),
    baseURL: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
    defaultHeaders: {
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "Disaster Response AI",
    }
  });
}

export function isOpenAIConfigured(): boolean {
  return Boolean(apiKey?.trim());
}