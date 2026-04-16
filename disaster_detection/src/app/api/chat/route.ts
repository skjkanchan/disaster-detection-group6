import { NextResponse } from "next/server";
import { getOpenAIClient } from "@/lib/openai";
import { loadPredictions } from "@/lib/chatbot/data";
import { parseIntent, isSupported } from "@/lib/chatbot/intent-parser";
import { retrieve } from "@/lib/chatbot/retrievers";
import {
  generateResponse,
  buildFallbackResponse,
  buildMockResponse,
<<<<<<< HEAD
} from "@/lib/chatbot/response-generator";
import { logQuery } from "@/lib/chatbot/logger";

=======
  generateUnsupportedResponse,
} from "@/lib/chatbot/response-generator";
import { logQuery } from "@/lib/chatbot/logger";
>>>>>>> 3668e68178c76ba660fb92926b2d0f539f5880f3
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

  let records;
  try {
    records = await loadPredictions();
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        error: "Failed to load disaster dataset.",
        message: "The damage prediction data could not be loaded. Please try again later.",
      },
      { status: 500 }
    );
  }

  const intent = parseIntent(userQuestion);

<<<<<<< HEAD
  if (!isSupported(intent)) {
    const message = buildFallbackResponse("unsupported", intent.params, 0);
    await logQuery({
      timestamp: new Date().toISOString(),
      userQuestion,
      intent: "unsupported",
      params: intent.params,
      recordCount: 0,
      usedMock: USE_MOCK,
      messagePreview: message.slice(0, 200),
=======
//   if (!isSupported(intent)) {
//     const message = buildFallbackResponse("unsupported", intent.params, 0);
//     await logQuery({
//       timestamp: new Date().toISOString(),
//       userQuestion,
//       intent: "unsupported",
//       params: intent.params,
//       recordCount: 0,
//       usedMock: USE_MOCK,
//       messagePreview: message.slice(0, 200),
//     });
//     return NextResponse.json({ message });
//   }

  if (!isSupported(intent)) {
    const openai = getOpenAIClient();
    let message: string;
    if (openai) {
        try {
        message = await generateUnsupportedResponse(openai, userQuestion);
        } catch {
        message = buildFallbackResponse("unsupported", intent.params, 0);
        }
    } else {
        message = buildFallbackResponse("unsupported", intent.params, 0);
    }
    await logQuery({
        timestamp: new Date().toISOString(),
        userQuestion,
        intent: "unsupported",
        params: intent.params,
        recordCount: 0,
        usedMock: USE_MOCK,
        messagePreview: message.slice(0, 200),
>>>>>>> 3668e68178c76ba660fb92926b2d0f539f5880f3
    });
    return NextResponse.json({ message });
  }

  const result = await retrieve(intent, records);

  const noResults = result.records.length === 0;
  const useFallback =
    result.intent === "unsupported" ||
    (noResults && (result.intent === "address_lookup" || result.intent === "street_lookup" || result.intent === "region_summary"));

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
    return NextResponse.json({ message });
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
    return NextResponse.json({ message });
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
    const message = await generateResponse(openai, userQuestion, result);
    await logQuery({
      timestamp: new Date().toISOString(),
      userQuestion,
      intent: result.intent,
      params: result.params,
      recordCount: result.records.length,
      usedMock: false,
      messagePreview: message.slice(0, 200),
    });
    return NextResponse.json({ message });
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
<<<<<<< HEAD
}
=======
}
>>>>>>> 3668e68178c76ba660fb92926b2d0f539f5880f3
