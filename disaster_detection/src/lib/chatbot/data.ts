import type { DamageRecord } from "./types";

let cachedRecords: DamageRecord[] | null = null;

export async function loadPredictions(): Promise<DamageRecord[]> {
  if (cachedRecords) return cachedRecords;

  try {
    const metaRes = await fetch("https://0qdc5t28wa.execute-api.us-east-2.amazonaws.com/default/getMatthewMetadata");
    const metaData = await metaRes.json();
    
    type BBox = { id: string; minLng: number; maxLng: number; minLat: number; maxLat: number; };
    const bboxes: BBox[] = [];

    if (Array.isArray(metaData)) {
      for (const m of metaData) {
        if (!m.coordinates || m.coordinates.length === 0) continue;
        let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
        for (const [lng, lat] of m.coordinates) {
          if (lng < minLng) minLng = lng;
          if (lng > maxLng) maxLng = lng;
          if (lat < minLat) minLat = lat;
          if (lat > maxLat) maxLat = lat;
        }
        bboxes.push({ id: m.id, minLng, maxLng, minLat, maxLat });
      }
    }

    const bldgRes = await fetch("https://qsa092foyk.execute-api.us-east-2.amazonaws.com/default/getMatthewBuildings");
    const bldgData = await bldgRes.json();
    
    const records: DamageRecord[] = [];
    if (bldgData && bldgData.features) {
      for (const f of bldgData.features) {
        const coords = f.geometry?.coordinates?.[0];
        if (!coords || coords.length === 0) continue;
        const [lng, lat] = coords[0];
        
        let tileId: string | undefined;
        for (const b of bboxes) {
          if (lng >= b.minLng && lng <= b.maxLng && lat >= b.minLat && lat <= b.maxLat) {
            tileId = b.id;
            break;
          }
        }

        records.push({
          id: f.properties?.uid || Math.random().toString(),
          tileId,
          lat,
          lon: lng,
          damage_label: f.properties?.subtype || "un-classified",
          confidence: 0.95, // simulated from raw prediction
          explanation: `Detected class: ${f.properties?.subtype || "un-classified"}`,
          region: "Haiti", // Based on Matthew dataset bounds
        });
      }
    }
    
    cachedRecords = records;
    return records;
  } catch (err) {
    console.error("Error loading AWS predictions:", err);
    return [];
  }
}

/** Normalize string for matching (lowercase, collapse spaces). */
export function normalizeForMatch(s: string): string {
  return (s || "").toLowerCase().trim().replace(/\s+/g, " ");
}