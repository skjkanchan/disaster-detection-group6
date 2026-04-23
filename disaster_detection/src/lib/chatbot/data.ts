import path from "path";
import { promises as fs } from "fs";
import type { DamageRecord } from "./types";
import type { Prediction } from "@/app/utils/geojson";

const DATA_PATH = path.join(process.cwd(), "public", "data", "dummy_predictions.json");

const BUILDINGS_URL =
  process.env.NEXT_PUBLIC_MATTHEW_BUILDINGS_URL ||
  "https://qsa092foyk.execute-api.us-east-2.amazonaws.com/default/getMatthewBuildings";
const METADATA_URL =
  process.env.NEXT_PUBLIC_MATTHEW_METADATA_URL ||
  "https://0qdc5t28wa.execute-api.us-east-2.amazonaws.com/default/getMatthewMetadata";

/**
 * Load dummy ground-truth predictions (address/street/confidence enriched).
 * Used as a fallback for intents the real buildings endpoint cannot satisfy,
 * and as demo data for the default chatbot suggestions.
 */
export async function loadPredictions(): Promise<DamageRecord[]> {
  const raw = await fs.readFile(DATA_PATH, "utf8");
  const data = JSON.parse(raw) as Prediction[];
  return (Array.isArray(data) ? data : []).map(toDamageRecord);
}

function toDamageRecord(p: Prediction): DamageRecord {
  return {
    id: p.id,
    lat: p.lat,
    lon: p.lon,
    damage_label: p.damage_label,
    confidence: p.confidence,
    explanation: p.explanation,
    address: p.address,
    street: p.street,
    region: p.region,
  };
}

/** A real xBD building with polygon geometry and VLM/GT damage subtype. */
export type BuildingRecord = DamageRecord & {
  /** Original xBD subtype from the buildings endpoint (e.g. "major-damage"). */
  subtype: string;
  /** Bounding box of the polygon in [west, south, east, north] (lng/lat). */
  bbox: [number, number, number, number];
};

type TileMetadata = {
  id: string;
  /** [tl, tr, br, bl] in [lng, lat]. */
  coordinates: [number, number][];
};

type BuildingsGeoJSON = {
  type: "FeatureCollection";
  features: {
    type: "Feature";
    geometry: {
      type: "Polygon" | "MultiPolygon";
      coordinates: number[][][] | number[][][][];
    };
    properties: {
      uid?: string;
      subtype?: string;
      feature_type?: string;
      [k: string]: unknown;
    };
  }[];
};

/**
 * Map the xBD subtype (from the real buildings endpoint) onto the simpler
 * damage labels the retrievers / intent-parser already use.
 */
export function subtypeToLabel(subtype: string): string {
  const s = (subtype || "").toLowerCase().trim();
  if (s === "no-damage") return "no damage";
  if (s === "minor-damage") return "minor";
  if (s === "major-damage") return "major";
  if (s === "destroyed") return "destroyed";
  if (s === "un-classified") return "unclassified";
  return s || "unknown";
}

function polygonCentroidAndBbox(coords: number[][]): {
  lat: number;
  lon: number;
  bbox: [number, number, number, number];
} {
  let sumX = 0;
  let sumY = 0;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const n = coords.length;
  for (const [lng, lat] of coords) {
    sumX += lng;
    sumY += lat;
    if (lng < minX) minX = lng;
    if (lng > maxX) maxX = lng;
    if (lat < minY) minY = lat;
    if (lat > maxY) maxY = lat;
  }
  return {
    lat: sumY / n,
    lon: sumX / n,
    bbox: [minX, minY, maxX, maxY],
  };
}

/**
 * Find the nearest tile id for a given lng/lat by checking which tile's
 * bounding box contains the point; if none, fall back to the closest tile
 * centroid. Returns `undefined` if the metadata list is empty.
 */
function assignTileId(
  lng: number,
  lat: number,
  tiles: TileMetadata[]
): string | undefined {
  if (tiles.length === 0) return undefined;
  for (const t of tiles) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const [x, y] of t.coordinates) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    if (lng >= minX && lng <= maxX && lat >= minY && lat <= maxY) {
      return t.id;
    }
  }
  // Fallback: closest tile centroid.
  let bestId = tiles[0].id;
  let bestD = Infinity;
  for (const t of tiles) {
    let cx = 0;
    let cy = 0;
    for (const [x, y] of t.coordinates) {
      cx += x;
      cy += y;
    }
    cx /= t.coordinates.length;
    cy /= t.coordinates.length;
    const d = (cx - lng) ** 2 + (cy - lat) ** 2;
    if (d < bestD) {
      bestD = d;
      bestId = t.id;
    }
  }
  return bestId;
}

let _buildingsCache: {
  fetchedAt: number;
  records: BuildingRecord[];
} | null = null;
const BUILDINGS_TTL_MS = 5 * 60 * 1000;

/**
 * Fetch the real xBD building dataset from the API endpoints that the main
 * map already uses. Converts each building polygon into a BuildingRecord with
 * a centroid (lat/lon), bbox, normalized damage_label, and assigned tile id
 * (used as `region`). Results are cached in-memory for 5 minutes.
 *
 * Returns an empty array on failure so callers can fall back to dummy data.
 */
export async function loadBuildings(): Promise<BuildingRecord[]> {
  if (_buildingsCache && Date.now() - _buildingsCache.fetchedAt < BUILDINGS_TTL_MS) {
    return _buildingsCache.records;
  }

  let buildingsJson: BuildingsGeoJSON | null = null;
  let metadata: TileMetadata[] = [];

  try {
    const [bRes, mRes] = await Promise.all([
      fetch(BUILDINGS_URL),
      fetch(METADATA_URL),
    ]);
    if (bRes.ok) {
      buildingsJson = (await bRes.json()) as BuildingsGeoJSON;
    }
    if (mRes.ok) {
      const raw = await mRes.json();
      if (Array.isArray(raw)) metadata = raw as TileMetadata[];
    }
  } catch {
    _buildingsCache = { fetchedAt: Date.now(), records: [] };
    return [];
  }

  if (!buildingsJson || !Array.isArray(buildingsJson.features)) {
    _buildingsCache = { fetchedAt: Date.now(), records: [] };
    return [];
  }

  const records: BuildingRecord[] = [];
  buildingsJson.features.forEach((f, idx) => {
    if (!f.geometry) return;
    let ring: number[][] | null = null;
    if (f.geometry.type === "Polygon") {
      ring = (f.geometry.coordinates as number[][][])[0] ?? null;
    } else if (f.geometry.type === "MultiPolygon") {
      ring = ((f.geometry.coordinates as number[][][][])[0] ?? [])[0] ?? null;
    }
    if (!ring || ring.length < 3) return;

    const { lat, lon, bbox } = polygonCentroidAndBbox(ring);
    const subtype = (f.properties?.subtype || "un-classified").toString();
    const uid =
      (f.properties?.uid as string | undefined) || `feature_${idx}`;
    const tileId = assignTileId(lon, lat, metadata);

    records.push({
      id: uid,
      lat,
      lon,
      damage_label: subtypeToLabel(subtype),
      confidence: 1.0, // ground-truth / VLM output has no confidence in this schema
      subtype,
      region: tileId ? `tile_${tileId}` : undefined,
      bbox,
    });
  });

  _buildingsCache = { fetchedAt: Date.now(), records };
  return records;
}

/** Normalize string for matching (lowercase, collapse spaces). */
export function normalizeForMatch(s: string): string {
  return (s || "").toLowerCase().trim().replace(/\s+/g, " ");
}
