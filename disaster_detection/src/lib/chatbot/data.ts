import path from "path";
import { promises as fs } from "fs";
import type { DamageRecord } from "./types";
import type { Prediction } from "@/app/utils/geojson";

const RESULTS_DIR = path.join(process.cwd(), "public", "data", "results");

export async function loadPredictions(): Promise<DamageRecord[]> {
  try {
    const files = await fs.readdir(RESULTS_DIR);
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    
    // Read and parse all JSON files
    const allPredictions: Prediction[] = [];
    
    for (const file of jsonFiles) {
      const filePath = path.join(RESULTS_DIR, file);
      const raw = await fs.readFile(filePath, "utf8");
      const predictions = JSON.parse(raw) as Prediction[];
      allPredictions.push(...predictions);
    }
    
    return allPredictions.map(toDamageRecord);
  } catch (error) {
    console.error("Error loading predictions:", error);
    return [];
  }
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

/** Normalize string for matching (lowercase, collapse spaces). */
export function normalizeForMatch(s: string): string {
  return (s || "").toLowerCase().trim().replace(/\s+/g, " ");
}


// import path from "path";
// import { promises as fs } from "fs";
// import type { DamageRecord } from "./types";
// import type { Prediction } from "@/app/utils/geojson";

// const DATA_PATH = path.join(process.cwd(), "public", "data", "dummy_predictions.json");

// export async function loadPredictions(): Promise<DamageRecord[]> {
//   const raw = await fs.readFile(DATA_PATH, "utf8");
//   const data = JSON.parse(raw) as Prediction[];
//   return (Array.isArray(data) ? data : []).map(toDamageRecord);
// }

// function toDamageRecord(p: Prediction): DamageRecord {
//   return {
//     id: p.id,
//     lat: p.lat,
//     lon: p.lon,
//     damage_label: p.damage_label,
//     confidence: p.confidence,
//     explanation: p.explanation,
//     address: p.address,
//     street: p.street,
//     region: p.region,
//   };
// }

// /** Normalize string for matching (lowercase, collapse spaces). */
// export function normalizeForMatch(s: string): string {
//   return (s || "").toLowerCase().trim().replace(/\s+/g, " ");
// }