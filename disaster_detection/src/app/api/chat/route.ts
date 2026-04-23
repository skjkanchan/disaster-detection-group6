import { NextResponse } from "next/server";
import { getOpenAIClient } from "@/lib/openai";
import { loadPredictions, loadBuildings } from "@/lib/chatbot/data";
import { parseIntent, isSupported } from "@/lib/chatbot/intent-parser";
import { retrieve } from "@/lib/chatbot/retrievers";
import {
  generateResponse,
  buildFallbackResponse,
  buildMockResponse,
} from "@/lib/chatbot/response-generator";
import { logQuery } from "@/lib/chatbot/logger";
import { buildMapAction } from "@/lib/chatbot/map-action";

export const maxDuration = 30;

const USE_MOCK =
  process.env.OPENAI_USE_MOCK === "true" ||
  process.env.OPENAI_USE_MOCK === "1";

type Message = { role: "user" | "assistant" | "system"; content: string };

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

  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const userQuestion = (lastUser?.content ?? "").trim();
  if (!userQuestion) {
    return NextResponse.json(
      { error: "Last message must be from the user and non-empty." },
      { status: 400 }
    );
  }

  let dummy;
  try {
    dummy = await loadPredictions();
  } catch {
    return NextResponse.json(
      {
        error: "Failed to load disaster dataset.",
        message: "The damage prediction data could not be loaded. Please try again later.",
      },
      { status: 500 }
    );
  }

  // Real xBD building dataset (polygons + damage subtype). Best-effort: if the
  // AWS endpoint is unreachable, `loadBuildings` returns [] and retrievers
  // fall back to the dummy predictions so the chatbot stays functional.
  let buildings: Awaited<ReturnType<typeof loadBuildings>> = [];
  try {
    buildings = await loadBuildings();
  } catch {
    buildings = [];
  }

  const intent = parseIntent(userQuestion);

  // Always run retrieve() — even for unsupported intents it may be rescued by
  // the BM25 corpus retriever and upgraded to general_knowledge.
  const result = await retrieve(intent, { buildings, dummy }, userQuestion);

  if (!isSupported({ type: result.intent, params: result.params })) {
    const message = buildFallbackResponse("unsupported", result.params, 0);
    await logQuery({
      timestamp: new Date().toISOString(),
      userQuestion,
      intent: "unsupported",
      params: result.params,
      recordCount: 0,
      usedMock: USE_MOCK,
      messagePreview: message.slice(0, 200),
    });
    return NextResponse.json({ message });
  }

  const PROPERTY_INTENTS = new Set([
    "address_lookup", "id_lookup", "street_lookup",
    "damage_filter", "confidence_filter", "nearby_lookup",
  ]);

  const noResults = result.records.length === 0;
  const isGeneralKnowledge = result.intent === "general_knowledge";
  const useFallback =
    result.intent === "unsupported" ||
    (!isGeneralKnowledge && noResults && PROPERTY_INTENTS.has(result.intent));

  const includeRecords = PROPERTY_INTENTS.has(result.intent);
  const cappedRecords = includeRecords ? result.records.slice(0, 20) : undefined;

  // Derive an optional map focus action so the main Mapbox map can pan/zoom
  // and color-filter buildings to match the chatbot's answer.
  const mapAction = buildMapAction(result);

  if (useFallback) {
    const message = buildFallbackResponse(result.intent, result.params, result.records.length);
    await logQuery({
      timestamp: new Date().toISOString(),
      userQuestion,
      intent: result.intent,
      params: result.params,
      recordCount: result.records.length,
      usedMock: USE_MOCK,
      messagePreview: message.slice(0, 200),
    });
    return NextResponse.json({ message, ...(mapAction && { map_action: mapAction }) });
  }

  if (USE_MOCK) {
    const message = buildMockResponse(result);
    await logQuery({
      timestamp: new Date().toISOString(),
      userQuestion,
      intent: result.intent,
      params: result.params,
      recordCount: result.records.length,
      usedMock: true,
      messagePreview: message.slice(0, 200),
    });
    return NextResponse.json({
      message,
      ...(cappedRecords && { records: cappedRecords }),
      ...(mapAction && { map_action: mapAction }),
    });
  }

  const openai = getOpenAIClient();
  if (!openai) {
    return NextResponse.json(
      {
        error: "OpenAI API key not configured.",
        message: "Add OPENAI_API_KEY to .env.local for LLM-generated answers. Summary-only mode is available for supported queries.",
      },
      { status: 500 }
    );
  }

  try {
    const message = await generateResponse(openai, userQuestion, result, {
      history: messages,
    });
    await logQuery({
      timestamp: new Date().toISOString(),
      userQuestion,
      intent: result.intent,
      params: result.params,
      recordCount: result.records.length,
      usedMock: false,
      messagePreview: message.slice(0, 200),
    });
    return NextResponse.json({
      message,
      ...(cappedRecords && { records: cappedRecords }),
      ...(mapAction && { map_action: mapAction }),
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    const is429 = errorMessage.includes("429") || errorMessage.toLowerCase().includes("quota");
    const friendly = is429
      ? "OpenAI quota exceeded. Add billing at https://platform.openai.com/account/billing or set OPENAI_USE_MOCK=true to test without the API."
      : `OpenAI request failed: ${errorMessage}`;
    await logQuery({
      timestamp: new Date().toISOString(),
      userQuestion,
      intent: result.intent,
      params: result.params,
      recordCount: result.records.length,
      usedMock: USE_MOCK,
      messagePreview: friendly.slice(0, 200),
      error: errorMessage,
    });
    return NextResponse.json(
      { error: friendly, message: friendly },
      { status: 500 }
    );
  }
}