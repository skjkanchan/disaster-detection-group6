/**
 * Supported question types for the disaster assessment chatbot.
 * Only these intents are supported; all others are rejected.
 */
export type QuestionType =
  | "address_lookup"
  | "id_lookup"
  | "street_lookup"
  | "region_summary"
  | "severity_summary"
  | "dataset_summary"
  | "top_affected_areas"
  | "damage_filter"
  | "confidence_filter"
  | "nearby_lookup"
  | "general_knowledge"
  | "unsupported";

export type Intent = {
  type: QuestionType;
  /** Normalized query params extracted from user input (e.g. address, street name, region) */
  params: Record<string, string>;
};

/** One record from the disaster damage dataset (matches Prediction with optional address fields). */
export type DamageRecord = {
  id: string;
  lat: number;
  lon: number;
  damage_label: string;
  confidence: number;
  explanation?: string;
  address?: string;
  street?: string;
  region?: string;
};

/** A single retrieved corpus chunk attached to a RetrievalResult. */
export type CorpusSource = {
  id: string;
  title: string;
  source: string;
  date?: string;
  url?: string;
  text: string;
  score: number;
};

/** Instructions for the main Mapbox map when answering a chat query. */
export type MapAction = {
  /** West, south, east, north in degrees. */
  bbox?: [number, number, number, number];
  /** Subset of xBD building UIDs to highlight; all others dimmed/hidden. */
  buildingUids?: string[];
  /** Damage subtypes (matching the xBD `subtype` property) to keep visible. */
  damageFilter?: ("no-damage" | "minor-damage" | "major-damage" | "destroyed" | "un-classified")[];
};

/** Result of a retriever: records plus optional summary stats for the response generator. */
export type RetrievalResult = {
  intent: QuestionType;
  params: Record<string, string>;
  records: DamageRecord[];
  /** Optional pre-aggregated counts for severity_summary / dataset_summary / top_affected_areas */
  summary?: {
    total: number;
    byLabel?: Record<string, number>;
    byRegion?: Record<string, number>;
    byStreet?: Record<string, number>;
    topAreas?: { name: string; count: number; label?: string }[];
  };
  /** Curated knowledge base text for general_knowledge intent */
  knowledge?: string;
  /** External RAG sources retrieved via BM25 over the curated corpus. */
  corpus?: CorpusSource[];
  /** Optional instructions for the main map (pan/zoom/filter). */
  mapAction?: MapAction;
};