import fs from "fs";
import path from "path";
import type { DamageRecord, Intent, RetrievalResult } from "./types";
import { normalizeForMatch, type BuildingRecord } from "./data";
import { retrieveCorpus } from "./corpus";

/** BM25 score threshold above which we consider an otherwise-unsupported
 * question answerable from external sources. Tuned empirically — well below
 * the top hits for well-matched queries. */
const CORPUS_ANSWER_THRESHOLD = 1.5;

export type DataSources = {
  /** Real xBD building dataset (polygons + subtype + tile id). */
  buildings: BuildingRecord[];
  /** Dummy predictions with address/street/confidence enrichment. */
  dummy: DamageRecord[];
};

/**
 * Fetch records matching the parsed intent.
 * Each question type is routed to either the real buildings dataset (for
 * dataset-wide, severity, filter, region queries) or the dummy predictions
 * (for address/street/id/nearby queries, which the real data lacks).
 */
export async function retrieve(
  intent: Intent,
  data: DataSources,
  userInput = ""
): Promise<RetrievalResult> {
  const { buildings, dummy } = data;
  // Prefer real buildings for dataset-scale queries; fall back to dummy when
  // the real endpoint returned nothing (e.g. offline / AWS failure).
  const primary = buildings.length > 0 ? buildings : dummy;

  switch (intent.type) {
    // Address / street / id / nearby — dummy only (real data has no addresses)
    case "address_lookup":
      return addressLookup(intent.params, dummy);
    case "id_lookup":
      return idLookup(intent.params, buildings.length > 0 ? [...buildings, ...dummy] : dummy);
    case "street_lookup":
      return streetLookup(intent.params, dummy);
    case "nearby_lookup":
      return nearbyLookup(intent.params, dummy);

    // Region summary can work against either — try real first by tile_<id>,
    // fall back to dummy when no tile region is queried.
    case "region_summary":
      return regionSummary(intent.params, primary);

    // Dataset-scale and filter queries — use real buildings when available.
    case "severity_summary":
      return severitySummary(primary);
    case "dataset_summary":
      return datasetSummary(primary);
    case "top_affected_areas":
      return topAffectedAreas(primary);
    case "damage_filter":
      return damageFilter(intent.params, primary);
    case "confidence_filter":
      // Real buildings have confidence=1.0 uniformly; dummy has real variance.
      return confidenceFilter(intent.params, dummy);

    case "general_knowledge":
      return generalKnowledge(primary, userInput);
    default:
      return unsupportedWithCorpus(intent.params, userInput);
  }
}

/**
 * For intents we can't parse, still try BM25 against the curated corpus. If
 * the top hit beats the threshold, upgrade the result to `general_knowledge`
 * so the LLM can answer from external sources.
 */
function unsupportedWithCorpus(
  params: Record<string, string>,
  userInput: string
): RetrievalResult {
  if (!userInput.trim()) {
    return { intent: "unsupported", params, records: [] };
  }
  const hits = retrieveCorpus(userInput, 4);
  if (hits.length > 0 && hits[0].score >= CORPUS_ANSWER_THRESHOLD) {
    return {
      intent: "general_knowledge",
      params,
      records: [],
      corpus: hits.map((h) => ({
        id: h.id,
        title: h.title,
        source: h.source,
        date: h.date,
        url: h.url,
        text: h.text,
        score: h.score,
      })),
    };
  }
  return { intent: "unsupported", params, records: [] };
}

function addressLookup(params: Record<string, string>, records: DamageRecord[]): RetrievalResult {
  const address = normalizeForMatch(params.address || "");
  const matched = records.filter(
    (r) => r.address && normalizeForMatch(r.address) === address
  );
  return {
    intent: "address_lookup",
    params: { address: params.address || "" },
    records: matched,
  };
}

function streetLookup(params: Record<string, string>, records: DamageRecord[]): RetrievalResult {
  const street = normalizeForMatch(params.street || "");
  const matched = records.filter(
    (r) => r.street && normalizeForMatch(r.street) === street
  );
  const byLabel: Record<string, number> = {};
  matched.forEach((r) => {
    const L = (r.damage_label || "unknown").toLowerCase();
    byLabel[L] = (byLabel[L] ?? 0) + 1;
  });
  return {
    intent: "street_lookup",
    params: { street: params.street || "" },
    records: matched,
    summary: {
      total: matched.length,
      byLabel: Object.keys(byLabel).length > 0 ? byLabel : undefined,
    },
  };
}

function regionSummary(params: Record<string, string>, records: DamageRecord[]): RetrievalResult {
  const region = normalizeForMatch(params.region || "");
  const matched = records.filter(
    (r) => r.region && normalizeForMatch(r.region) === region
  );
  const byLabel: Record<string, number> = {};
  matched.forEach((r) => {
    const L = (r.damage_label || "unknown").toLowerCase();
    byLabel[L] = (byLabel[L] ?? 0) + 1;
  });
  return {
    intent: "region_summary",
    params: { region: params.region || "" },
    records: matched,
    summary: {
      total: matched.length,
      byLabel: Object.keys(byLabel).length > 0 ? byLabel : undefined,
    },
  };
}

function severitySummary(records: DamageRecord[]): RetrievalResult {
  const byLabel: Record<string, number> = {};
  records.forEach((r) => {
    const L = (r.damage_label || "unknown").toLowerCase();
    byLabel[L] = (byLabel[L] ?? 0) + 1;
  });
  return {
    intent: "severity_summary",
    params: {},
    records,
    summary: { total: records.length, byLabel },
  };
}

function datasetSummary(records: DamageRecord[]): RetrievalResult {
  const byLabel: Record<string, number> = {};
  const byRegion: Record<string, number> = {};
  records.forEach((r) => {
    const L = (r.damage_label || "unknown").toLowerCase();
    byLabel[L] = (byLabel[L] ?? 0) + 1;
    if (r.region) {
      const R = r.region.trim();
      byRegion[R] = (byRegion[R] ?? 0) + 1;
    }
  });
  return {
    intent: "dataset_summary",
    params: {},
    records,
    summary: { total: records.length, byLabel, byRegion },
  };
}

function topAffectedAreas(records: DamageRecord[]): RetrievalResult {
  const byStreet: Record<string, { count: number; worst: string }> = {};
  const severityRank: Record<string, number> = {
    destroyed: 4,
    major: 3,
    minor: 2,
    "no damage": 1,
    unknown: 0,
  };
  records.forEach((r) => {
    const street = (r.street || r.region || r.id).trim();
    if (!street) return;
    const label = (r.damage_label || "").toLowerCase();
    const rank = severityRank[label] ?? 0;
    if (!byStreet[street]) {
      byStreet[street] = { count: 0, worst: label };
    }
    byStreet[street].count += 1;
    if (rank > (severityRank[byStreet[street].worst] ?? 0)) {
      byStreet[street].worst = label;
    }
  });
  const topAreas = Object.entries(byStreet)
    .map(([name, v]) => ({ name, count: v.count, label: v.worst }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  return {
    intent: "top_affected_areas",
    params: {},
    records,
    summary: { total: records.length, topAreas },
  };
}

function idLookup(params: Record<string, string>, records: DamageRecord[]): RetrievalResult {
  const id = normalizeForMatch(params.id || "");
  const matched = records.filter((r) => normalizeForMatch(r.id) === id);
  return {
    intent: "id_lookup",
    params: { id: params.id || "" },
    records: matched,
  };
}

function damageFilter(params: Record<string, string>, records: DamageRecord[]): RetrievalResult {
  const level = normalizeForMatch(params.damage_level || "");
  const matched = records.filter(
    (r) => normalizeForMatch(r.damage_label) === level
  );
  const byLabel: Record<string, number> = {};
  matched.forEach((r) => {
    const L = (r.damage_label || "unknown").toLowerCase();
    byLabel[L] = (byLabel[L] ?? 0) + 1;
  });
  return {
    intent: "damage_filter",
    params: { damage_level: params.damage_level || "" },
    records: matched,
    summary: { total: matched.length, byLabel },
  };
}

function confidenceFilter(params: Record<string, string>, records: DamageRecord[]): RetrievalResult {
  const threshold = parseFloat(params.min_confidence || "0") / 100;
  const matched = records.filter((r) => r.confidence >= threshold);
  const byLabel: Record<string, number> = {};
  matched.forEach((r) => {
    const L = (r.damage_label || "unknown").toLowerCase();
    byLabel[L] = (byLabel[L] ?? 0) + 1;
  });
  return {
    intent: "confidence_filter",
    params: { min_confidence: params.min_confidence || "0" },
    records: matched,
    summary: { total: matched.length, byLabel },
  };
}

let _knowledgeBaseCache: string | null = null;

function loadKnowledgeBase(): string {
  if (_knowledgeBaseCache) return _knowledgeBaseCache;
  const kbPath = path.join(process.cwd(), "src", "lib", "chatbot", "knowledge-base.md");
  _knowledgeBaseCache = fs.readFileSync(kbPath, "utf-8");
  return _knowledgeBaseCache;
}

function generalKnowledge(records: DamageRecord[], userInput = ""): RetrievalResult {
  const knowledge = loadKnowledgeBase();

  const byLabel: Record<string, number> = {};
  const byRegion: Record<string, number> = {};
  records.forEach((r) => {
    const L = (r.damage_label || "unknown").toLowerCase();
    byLabel[L] = (byLabel[L] ?? 0) + 1;
    if (r.region) {
      byRegion[r.region.trim()] = (byRegion[r.region.trim()] ?? 0) + 1;
    }
  });

  const datasetContext = [
    `\n## Current Dataset (chatbot demo data)`,
    `Total properties assessed: ${records.length}`,
    `Damage breakdown: ${Object.entries(byLabel).map(([k, v]) => `${k}: ${v}`).join(", ")}`,
    `Regions: ${Object.entries(byRegion).map(([k, v]) => `${k}: ${v}`).join(", ")}`,
    `Properties:`,
    ...records.slice(0, 30).map((r) => `- ${r.id}: ${r.address || "unknown address"}, ${r.damage_label} (${(r.confidence * 100).toFixed(0)}% confidence)${r.street ? `, ${r.street}` : ""}${r.region ? `, ${r.region}` : ""}${r.explanation ? ` — ${r.explanation}` : ""}`),
  ].join("\n");

  const corpusHits = userInput.trim() ? retrieveCorpus(userInput, 4) : [];

  return {
    intent: "general_knowledge",
    params: {},
    records: [],
    knowledge: knowledge + datasetContext,
    summary: { total: records.length, byLabel, byRegion },
    corpus: corpusHits.map((h) => ({
      id: h.id,
      title: h.title,
      source: h.source,
      date: h.date,
      url: h.url,
      text: h.text,
      score: h.score,
    })),
  };
}

function nearbyLookup(params: Record<string, string>, records: DamageRecord[]): RetrievalResult {
  const address = normalizeForMatch(params.address || "");
  const anchor = records.find(
    (r) => r.address && normalizeForMatch(r.address) === address
  );
  if (!anchor) {
    return {
      intent: "nearby_lookup",
      params: { address: params.address || "" },
      records: [],
    };
  }
  const RADIUS_DEG = 0.01; // ~1 km
  const matched = records.filter((r) => {
    const dLat = Math.abs(r.lat - anchor.lat);
    const dLon = Math.abs(r.lon - anchor.lon);
    return dLat <= RADIUS_DEG && dLon <= RADIUS_DEG;
  });
  return {
    intent: "nearby_lookup",
    params: { address: params.address || "" },
    records: matched,
    summary: { total: matched.length },
  };
}