import type { DamageRecord, MapAction, RetrievalResult } from "./types";
import type { BuildingRecord } from "./data";

/** Convert our simplified damage_label back into the xBD subtype string the
 * map layer actually filters on. */
export function labelToSubtype(
  label: string
): MapAction["damageFilter"] extends (infer U)[] | undefined ? U : never {
  const L = (label || "").toLowerCase().trim();
  if (L === "no damage" || L === "no_damage" || L === "no-damage") return "no-damage";
  if (L === "minor" || L === "minor-damage" || L === "minor_damage") return "minor-damage";
  if (L === "major" || L === "major-damage" || L === "major_damage") return "major-damage";
  if (L === "destroyed") return "destroyed";
  return "un-classified";
}

function hasBbox(r: DamageRecord | BuildingRecord): r is BuildingRecord {
  return (r as BuildingRecord).bbox !== undefined;
}

/** Build a MapAction from a retrieval result, if one makes sense for this
 * intent. Returns undefined when the chat reply has no associated map focus
 * (e.g. pure general-knowledge answers). */
export function buildMapAction(result: RetrievalResult): MapAction | undefined {
  const { intent, params, records } = result;

  // damage_filter: highlight all buildings of a given subtype, keep default bounds.
  if (intent === "damage_filter") {
    const lvl = (params.damage_level || "").toLowerCase();
    if (!lvl) return undefined;
    return {
      damageFilter: [labelToSubtype(lvl)],
    };
  }

  if (records.length === 0) return undefined;

  // Compute a bbox from centroids (or polygon bboxes when available).
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const r of records) {
    if (hasBbox(r)) {
      const [w, s, e, n] = r.bbox;
      if (w < minX) minX = w;
      if (s < minY) minY = s;
      if (e > maxX) maxX = e;
      if (n > maxY) maxY = n;
    } else {
      if (r.lon < minX) minX = r.lon;
      if (r.lat < minY) minY = r.lat;
      if (r.lon > maxX) maxX = r.lon;
      if (r.lat > maxY) maxY = r.lat;
    }
  }
  if (!isFinite(minX) || !isFinite(minY)) return undefined;

  // Expand point-only bboxes by a small margin so Mapbox has something to fit.
  if (minX === maxX && minY === maxY) {
    minX -= 0.0015;
    maxX += 0.0015;
    minY -= 0.0015;
    maxY += 0.0015;
  }

  const bbox: MapAction["bbox"] = [minX, minY, maxX, maxY];

  // For address/id/nearby/street lookups where we have matching building UIDs
  // from the real dataset, highlight just those.
  const buildingUids = records
    .filter(hasBbox)
    .map((r) => r.id)
    .filter(Boolean);

  const action: MapAction = { bbox };
  if (buildingUids.length > 0) action.buildingUids = buildingUids;
  return action;
}
