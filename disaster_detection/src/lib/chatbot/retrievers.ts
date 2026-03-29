import type { DamageRecord, Intent, RetrievalResult } from "./types";
import { normalizeForMatch } from "./data";

/**
 * Fetch records matching the parsed intent.
 * Each question type has a dedicated query; returns empty records + summary when no match.
 */
export async function retrieve(
  intent: Intent,
  records: DamageRecord[]
): Promise<RetrievalResult> {
  switch (intent.type) {
    case "address_lookup":
      return addressLookup(intent.params, records);
    case "id_lookup":
      return idLookup(intent.params, records);
    case "street_lookup":
      return streetLookup(intent.params, records);
    case "region_summary":
      return regionSummary(intent.params, records);
    case "severity_summary":
      return severitySummary(records);
    case "dataset_summary":
      return datasetSummary(records);
    case "top_affected_areas":
      return topAffectedAreas(records);
    case "damage_filter":
      return damageFilter(intent.params, records);
    case "confidence_filter":
      return confidenceFilter(intent.params, records);
    case "nearby_lookup":
      return nearbyLookup(intent.params, records);
    default:
      return { intent: "unsupported", params: intent.params, records: [] };
  }
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
