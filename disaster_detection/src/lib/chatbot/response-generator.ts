import OpenAI from "openai";
import type { RetrievalResult } from "./types";

const SYSTEM_PROMPT = `You are a disaster assessment chatbot. You answer ONLY using the retrieved data provided below. Do not invent addresses, counts, or locations. If the data is empty or the question cannot be answered from it, say so in one sentence. Be factual and concise (2-4 sentences max). Do not repeat the user question.`;

function buildContextBlock(result: RetrievalResult): string {
  const { intent, params, records, summary } = result;
  const lines: string[] = [
    `Intent: ${intent}`,
    `Params: ${JSON.stringify(params)}`,
  ];
  if (summary) {
    lines.push(`Summary: ${JSON.stringify(summary)}`);
  }
  if (records.length > 0) {
    lines.push("Records (use only these):");
    records.slice(0, 50).forEach((r) => {
      const parts = [r.id, r.damage_label, `${(r.confidence * 100).toFixed(0)}%`];
      if (r.address) parts.push(r.address);
      if (r.street) parts.push(r.street);
      if (r.region) parts.push(r.region);
      if (r.explanation) parts.push(r.explanation);
      lines.push(`  ${parts.join(" | ")}`);
    });
    if (records.length > 50) lines.push(`  ... and ${records.length - 50} more`);
  } else {
    lines.push("Records: (none)");
  }
  return lines.join("\n");
}

export async function generateResponse(
  client: OpenAI,
  userQuestion: string,
  result: RetrievalResult,
  options: { model?: string, image?: string } = {}
): Promise<string> {
  const model = options.model || process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini";
  const context = buildContextBlock(result);

  const textContent = `Retrieved data:\n${context}\n\nUser question: ${userQuestion}\n\nAnswer using ONLY the retrieved data above. If there are no records or the question cannot be answered from the data, say so briefly. If an image of the map is provided, you can use it to help answer the user's question.`;

  const content: OpenAI.Chat.ChatCompletionContentPart[] = [{ type: "text", text: textContent }];
  if (options.image) {
    content.push({ type: "image_url", image_url: { url: options.image } });
  }

  const completion = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content },
    ],
    max_tokens: 512,
    temperature: 0.2,
  });

  const answer = completion.choices[0]?.message?.content?.trim();
  return answer || "I couldn't generate a response. Please try again.";
}

export async function generateUnsupportedResponse(
  client: OpenAI,
  userQuestion: string,
  image?: string
): Promise<string> {
  const content: OpenAI.Chat.ChatCompletionContentPart[] = [{ type: "text", text: userQuestion }];
  if (image) {
    content.push({ type: "image_url", image_url: { url: image } });
  }

  const completion = await client.chat.completions.create({
    model: process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are a friendly disaster response AI assistant. The user has asked something outside your scope or has provided an image. If the user provides an image, you are looking at a screenshot of their current heatmap/damage map. Answer their questions about the map explicitly taking the map screenshot into context. Otherwise, briefly let them know you specialize in damage assessment and summarize what you can do. Keep it concise.`,
      },
      { role: "user", content },
    ],
    max_tokens: 150,
    temperature: 0.7,
  });
  return (
    completion.choices[0]?.message?.content?.trim() ||
    buildFallbackResponse("unsupported", {}, 0)
  );
}

/**
 * Build a factual reply without calling the LLM (for no-results or unsupported).
 */
export function buildFallbackResponse(
  intent: RetrievalResult["intent"],
  params: Record<string, string>,
  recordCount: number
): string {
  if (intent === "unsupported") {
    return "This question type is not supported. I can only answer: address lookup (e.g. 'damage at 501 River Rd'), street lookup (e.g. 'damage on Main St'), region summary (e.g. 'summary for North'), severity summary, map tile context, dataset summary, and top affected areas.";
  }
  if (recordCount === 0) {
    if (params.tileId) return `No damage record found for the selected tile "${params.tileId}".`;
    if (params.address) return `No damage record found for address "${params.address}".`;
    if (params.street) return `No damage records found for street "${params.street}".`;
    if (params.region) return `No damage records found for region "${params.region}".`;
    return "No matching records in the dataset.";
  }
  return "";
}

/**
 * Build a short factual message from retrieval result without calling the LLM (for mock/demo mode).
 */
export function buildMockResponse(result: RetrievalResult): string {
  const { intent, params, records, summary } = result;
  if (records.length === 0 && !summary?.total) return buildFallbackResponse(intent, params, 0);

  switch (intent) {
    case "address_lookup":
    case "tile_lookup": {
      const r = records[0];
      if (!r) return `No record requested.`;
      return `${r.address || r.id}: ${r.damage_label} (${(r.confidence * 100).toFixed(0)}% confidence)${r.explanation ? `. ${r.explanation}` : ""}`;
    }
    case "street_lookup": {
      const byLabel = summary?.byLabel ?? {};
      const parts = Object.entries(byLabel).map(([k, v]) => `${k}: ${v}`);
      return `Found ${records.length} record(s) on ${params.street}. ${parts.join(", ")}.`;
    }
    case "region_summary": {
      const byLabel = summary?.byLabel ?? {};
      const parts = Object.entries(byLabel).map(([k, v]) => `${k}: ${v}`);
      return `Region ${params.region}: ${records.length} record(s). ${parts.join(", ")}.`;
    }
    case "severity_summary": {
      const byLabel = summary?.byLabel ?? {};
      const parts = Object.entries(byLabel).map(([k, v]) => `${k}: ${v}`);
      return `Dataset severity: ${parts.join(", ")}. Total: ${summary?.total ?? records.length}.`;
    }
    case "dataset_summary": {
      const byLabel = summary?.byLabel ?? {};
      const parts = Object.entries(byLabel).map(([k, v]) => `${k}: ${v}`);
      const regions = summary?.byRegion ? ` By region: ${JSON.stringify(summary.byRegion)}.` : "";
      return `Total: ${summary?.total ?? records.length} records. ${parts.join(", ")}.${regions}`;
    }
    case "top_affected_areas": {
      const top = summary?.topAreas ?? [];
      const parts = top.slice(0, 5).map((a) => `${a.name} (${a.count}${a.label ? `, worst: ${a.label}` : ""})`);
      return `Top affected: ${parts.join("; ")}.`;
    }
    default:
      return "No response generated.";
  }
}