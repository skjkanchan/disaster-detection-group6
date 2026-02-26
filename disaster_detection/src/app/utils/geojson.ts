// converts raw predictions into GeoJSON format which the map can render

export type DamageClass = "no_damage" | "minor" | "major" | "destroyed" | "unknown";

export type Prediction = {
  id: string;
  lat: number;
  lon: number;
  damage_label: string;
  confidence: number;
  explanation?: string;
  timestamp?: string;
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

  if (["no damage", "none", "0", "undamaged", "no_damage"].includes(s)) return { damage_class: "no_damage", severity_rank: 0 };
  if (["minor", "low", "light", "1"].includes(s)) return { damage_class: "minor", severity_rank: 1 };
  if (["major", "high", "severe", "2"].includes(s)) return { damage_class: "major", severity_rank: 2 };
  if (["destroyed", "collapsed", "total", "3"].includes(s)) return { damage_class: "destroyed", severity_rank: 3 };

  return { damage_class: "unknown", severity_rank: -1 };
}

function isValidPrediction(p: Prediction): boolean {
  if (!p || typeof p.id !== "string") return false;
  if (typeof p.lat !== "number" || typeof p.lon !== "number") return false;
  if (p.lat < -90 || p.lat > 90 || p.lon < -180 || p.lon > 180) return false;
  if (typeof p.confidence !== "number" || p.confidence < 0 || p.confidence > 1) return false;
  return true;
}

export function predictionsToFeatureCollection(predictions: Prediction[], bbox?: BBox | null, limit = 5000) {
  const filtered = (predictions || [])
    .filter(isValidPrediction)
    .filter((p) => {
      if (!bbox) return true;
      return p.lon >= bbox.minLon && p.lon <= bbox.maxLon && p.lat >= bbox.minLat && p.lat <= bbox.maxLat;
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
          type: "Point" as const,
          coordinates: [p.lon, p.lat], // [lon, lat]
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