import { NextResponse } from "next/server";
import { getOpenAIClient } from "@/lib/openai";

export const maxDuration = 30;

const SYSTEM_PROMPT = `You are a disaster response AI assistant for geospatial damage assessment and emergency response.

Your capabilities (and how you should describe them to users):
- Assess damage in specific areas (e.g. downtown, neighborhoods)
- Identify and describe critical zones that need immediate attention
- Building stability analysis and safety guidance
- Infrastructure status (roads, utilities, shelters)

Data integration is not yet live: when users ask for specific damage reports, critical zones, or infrastructure status for a real area, respond helpfully and say that detailed geospatial data and live assessments will be available once the data pipeline is connected. Until then, offer general guidance on what such an analysis would include, how to prioritize response, and what to look for in the field. Keep answers concise and actionable.`;

type Message = { role: "user" | "assistant" | "system"; content: string };

const USE_MOCK =
  process.env.OPENAI_USE_MOCK === "true" || process.env.OPENAI_USE_MOCK === "1";

function getMockResponse(lastUserMessage: string): string {
  const lower = lastUserMessage.toLowerCase();
  if (lower.includes("downtown") || lower.includes("damage") || lower.includes("assess"))
    return "In mock mode I can't access live data yet. Once the data pipeline is connected, I'll assess damage by combining satellite imagery, ground reports, and infrastructure layers. For now, prioritize areas with visible structural damage and blocked roads.";
  if (lower.includes("critical zone"))
    return "Critical zones are typically areas with collapsed buildings, blocked evacuation routes, or damaged utilities. In mock mode I don't have real boundaries; once geospatial data is integrated I'll show them on a map.";
  if (lower.includes("building") || lower.includes("stability"))
    return "Building stability analysis uses structural damage indicators and occupancy data. With the pipeline connected I'll flag unsafe structures and suggest inspection order. For now, treat visibly damaged or leaning structures as high priority.";
  if (lower.includes("infrastructure"))
    return "Infrastructure status would cover roads, power, water, and shelters. Mock mode has no live feeds; once connected I'll summarize status by area and highlight outages.";
  return "I'm your disaster response assistant. In mock mode I can't query real data yet. Ask about damage assessment, critical zones, building stability, or infrastructure—I'll give placeholder guidance until the data pipeline is live.";
}

export async function POST(req: Request) {
  let body: { messages?: Message[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body. Expected { messages: [{ role, content }] }." },
      { status: 400 }
    );
  }

  const messages = body.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json(
      { error: "Body must include a non-empty messages array." },
      { status: 400 }
    );
  }

  // Mock mode: return a fake response so you can test the UI without an API key or quota
  if (USE_MOCK) {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    const content = getMockResponse(lastUser?.content ?? "");
    return NextResponse.json({ message: content });
  }

  const openai = getOpenAIClient();
  if (!openai) {
    return NextResponse.json(
      { error: "OpenAI API key not configured. Add OPENAI_API_KEY to .env.local, or set OPENAI_USE_MOCK=true to test without the API." },
      { status: 500 }
    );
  }

  const openAiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...messages.map((m: Message) => ({
      role: m.role as "user" | "assistant" | "system",
      content: m.content,
    })),
  ];

  try {
    const model = process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini";
    const completion = await openai.chat.completions.create({
      model,
      messages: openAiMessages,
      max_tokens: 1024,
    });

    const content =
      completion.choices[0]?.message?.content?.trim() ??
      "I couldn't generate a response. Please try again.";

    return NextResponse.json({ message: content });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    const is429 = error.includes("429") || error.toLowerCase().includes("quota");
    const friendlyError = is429
      ? "Your OpenAI account is out of quota (usage limit). Add a payment method or credits at https://platform.openai.com/account/billing and try again in a few minutes."
      : `OpenAI request failed: ${error}`;
    // Include raw error so you can see the exact message (e.g. model not found vs 429)
    return NextResponse.json(
      { error: friendlyError, raw: error },
      { status: 500 }
    );
  }
}
