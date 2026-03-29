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
  options: { model?: string } = {}
): Promise<string> {
  const model = options.model || process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini";
  const context = buildContextBlock(result);

  const content = `Retrieved data:\n${context}\n\nUser question: ${userQuestion}\n\nAnswer using ONLY the retrieved data above. If there are no records or the question cannot be answered from the data, say so briefly.`;

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

/**
 * Build a factual reply without calling the LLM (for no-results or unsupported).
 */
export function buildFallbackResponse(
  intent: RetrievalResult["intent"],
  params: Record<string, string>,
  recordCount: number
): string {
  if (intent === "unsupported") {
    return "This question type is not supported. I can answer: address lookup, property ID lookup (e.g. 'florence_1'), street lookup, region summary, severity summary, dataset summary, top affected areas, damage level filter (e.g. 'show all destroyed'), confidence filter (e.g. 'properties above 90%'), and nearby properties (e.g. 'near 501 River Rd').";
  }
  if (recordCount === 0) {
    if (intent === "id_lookup" && params.id) return `No property found with ID "${params.id}".`;
    if (intent === "nearby_lookup" && params.address) return `No properties found near "${params.address}". The anchor address may not exist in the dataset.`;
    if (intent === "damage_filter" && params.damage_level) return `No properties found with damage level "${params.damage_level}".`;
    if (intent === "confidence_filter") return `No properties found above ${params.min_confidence}% confidence.`;
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
    case "address_lookup": {
      const r = records[0];
      if (!r) return `No record for "${params.address}".`;
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
    case "id_lookup": {
      const r = records[0];
      if (!r) return `No property found with ID "${params.id}".`;
      return `Property ${r.id}: ${r.damage_label} (${(r.confidence * 100).toFixed(0)}% confidence)${r.address ? ` at ${r.address}` : ""}${r.explanation ? `. ${r.explanation}` : ""}.`;
    }
    case "damage_filter": {
      return `Found ${records.length} ${params.damage_level} propert${records.length === 1 ? "y" : "ies"}.`;
    }
    case "confidence_filter": {
      return `Found ${records.length} propert${records.length === 1 ? "y" : "ies"} above ${params.min_confidence}% confidence.`;
    }
    case "nearby_lookup": {
      return `Found ${records.length} propert${records.length === 1 ? "y" : "ies"} near "${params.address}" (within ~1 km).`;
    }
    default:
      return "No response generated.";
  }
}
