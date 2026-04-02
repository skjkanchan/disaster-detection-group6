import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY;

export function getOpenAIClient(): OpenAI | null {
  if (!apiKey?.trim()) return null;
  return new OpenAI({ apiKey: apiKey.trim() });
}

export function isOpenAIConfigured(): boolean {
  return Boolean(apiKey?.trim());
}