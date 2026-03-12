// converts raw predictions into GeoJSON format which the map can render

export type DamageClass = "no_damage" | "minor" | "major" | "destroyed" | "unknown";

export type Prediction = {
  id: string;
  damage_label: string;
  confidence: number;
  explanation?: string;
  timestamp?: string;
  polygon: [number, number][];
};

type BBox = { minLon: number; minLat: number; maxLon: number; maxLat: number };

export function parseBBox(bboxStr: string | null): BBox | null {
  if (!bboxStr) return null;
  const parts = bboxStr.split(",").map((x) => Number(x.trim()));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return null;
  const [minLon, minLat, maxLon, maxLat] = parts;
  if (minLon < -180 || maxLon > 180 || minLat < -90 || maxLat > 90) return null;
  if (minLon > maxLon || minLat > maxLat) return null;
  return { minLon, minLat, maxLon, maxLat };
}

export function normalizeDamageLabel(raw: string): { damage_class: DamageClass; severity_rank: number } {
  const s = (raw || "").toLowerCase().trim();

  if (["no damage", "none", "0", "undamaged", "no_damage"].includes(s)) {
    return { damage_class: "no_damage", severity_rank: 0 };
  }
  if (["minor", "low", "light", "1"].includes(s)) {
    return { damage_class: "minor", severity_rank: 1 };
  }
  if (["major", "high", "severe", "2"].includes(s)) {
    return { damage_class: "major", severity_rank: 2 };
  }
  if (["destroyed", "collapsed", "total", "3"].includes(s)) {
    return { damage_class: "destroyed", severity_rank: 3 };
  }

  return { damage_class: "unknown", severity_rank: -1 };
}

function isValidCoordinate(coord: unknown): coord is [number, number] {
  return (
    Array.isArray(coord) &&
    coord.length === 2 &&
    typeof coord[0] === "number" &&
    typeof coord[1] === "number" &&
    coord[0] >= -180 &&
    coord[0] <= 180 &&
    coord[1] >= -90 &&
    coord[1] <= 90
  );
}

function isValidPrediction(p: Prediction): boolean {
  if (!p || typeof p.id !== "string") return false;
  if (typeof p.damage_label !== "string") return false;
  if (typeof p.confidence !== "number" || p.confidence < 0 || p.confidence > 1) return false;
  if (!Array.isArray(p.polygon) || p.polygon.length < 4) return false;
  if (!p.polygon.every(isValidCoordinate)) return false;

  const first = p.polygon[0];
  const last = p.polygon[p.polygon.length - 1];

  // polygon should be closed
  if (first[0] !== last[0] || first[1] !== last[1]) return false;

  return true;
}

function polygonIntersectsBBox(polygon: [number, number][], bbox: BBox): boolean {
  const lons = polygon.map((coord) => coord[0]);
  const lats = polygon.map((coord) => coord[1]);

  const polyMinLon = Math.min(...lons);
  const polyMaxLon = Math.max(...lons);
  const polyMinLat = Math.min(...lats);
  const polyMaxLat = Math.max(...lats);

  const noOverlap =
    polyMaxLon < bbox.minLon ||
    polyMinLon > bbox.maxLon ||
    polyMaxLat < bbox.minLat ||
    polyMinLat > bbox.maxLat;

  return !noOverlap;
}

export function predictionsToFeatureCollection(
  predictions: Prediction[],
  bbox?: BBox | null,
  limit = 5000
) {
  const filtered = (predictions || [])
    .filter(isValidPrediction)
    .filter((p) => {
      if (!bbox) return true;
      return polygonIntersectsBBox(p.polygon, bbox);
    })
    .slice(0, Math.max(1, Math.min(limit, 50000)));

  return {
    type: "FeatureCollection" as const,
    features: filtered.map((p) => {
      const { damage_class, severity_rank } = normalizeDamageLabel(p.damage_label);

      return {
        type: "Feature" as const,
        id: p.id,
        geometry: {
          type: "Polygon" as const,
          coordinates: [p.polygon], // important: wrap polygon in one extra array
        },
        properties: {
          damage_class,
          severity_rank,
          confidence: p.confidence,
          raw_label: p.damage_label,
          explanation: typeof p.explanation === "string" ? p.explanation.slice(0, 240) : undefined,
          timestamp: p.timestamp,
        },
      };
    }),
  };
}