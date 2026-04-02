import path from "path";
import { promises as fs } from "fs";
import type { DamageRecord } from "./types";
import type { Prediction } from "@/app/utils/geojson";

const DATA_PATH = path.join(process.cwd(), "public", "data", "dummy_predictions.json");

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

/** Normalize string for matching (lowercase, collapse spaces). */
export function normalizeForMatch(s: string): string {
  return (s || "").toLowerCase().trim().replace(/\s+/g, " ");
}