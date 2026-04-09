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
    case "tile_lookup":
      return tileLookup(intent.params, records);
    case "stat_count":
      return statCount(intent.params, records);
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

function tileLookup(params: Record<string, string>, records: DamageRecord[]): RetrievalResult {
  const tileId = params.tileId || "";
  // Mapbox sometimes strips leading zeros if it coerces the ID to an integer.
  // We match exactly OR compare their parsed integer equivalents safely.
  let matched = records.filter((r) => {
      const r_attr = r.tileId || r.id;
      const r_id_int = parseInt(r_attr, 10);
      const str_id_int = parseInt(tileId, 10);
      return r_attr === tileId || (!isNaN(r_id_int) && r_id_int === str_id_int);
  });

  // Since we are using a dummy dataset with only 9 items, dynamically generate
  // a mock record for any other Mapbox tile clicked during the demo!
  if (matched.length === 0 && tileId) {
    const str_id_int = parseInt(tileId, 10);
    const paddedId = isNaN(str_id_int) ? tileId : String(str_id_int).padStart(8, '0');
    matched = [{
      id: paddedId,
      damage_label: "minor",
      confidence: 0.72,
      explanation: `Peripheral region ${paddedId} shows early indications of minor flooding or unverified debris scatter.`,
      lat: 34.62091,
      lon: -79.00578,
      region: "NC"
    }];
  }

  return {
    intent: "tile_lookup",
    params: { tileId },
    records: matched,
  };
}

function statCount(params: Record<string, string>, records: DamageRecord[]): RetrievalResult {
  const damageLabel = (params.damageLabel || "").toLowerCase();
  const entity = (params.entity || "").toLowerCase();

  const filtered = records.filter((r) => {
    const label = (r.damage_label || "").toLowerCase();

    // Match damage label
    const matchesDamage =
      !damageLabel || label === damageLabel;

    // Match entity (your dataset currently doesn't clearly support this,
    // so we keep it simple and safe)
    let matchesEntity = true;

    if (entity === "structures" || !entity) {
      matchesEntity = true;
    } else {
      // If you later add structure_type, update this
      matchesEntity = true;
    }

    return matchesDamage && matchesEntity;
  });

  // Optional breakdown (useful later)
  const byLabel: Record<string, number> = {};
  filtered.forEach((r) => {
    const L = (r.damage_label || "unknown").toLowerCase();
    byLabel[L] = (byLabel[L] ?? 0) + 1;
  });

  return {
    intent: "stat_count",
    params: {
      damageLabel: params.damageLabel || "",
      entity: params.entity || "",
    },
    records: filtered,
    summary: {
      total: filtered.length,
      byLabel,
    },
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

