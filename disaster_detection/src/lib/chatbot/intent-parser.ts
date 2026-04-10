import type { Intent, QuestionType } from "./types";

const SUPPORTED_TYPES: QuestionType[] = [
  "address_lookup",
  "id_lookup",
  "street_lookup",
  "region_summary",
  "severity_summary",
  "dataset_summary",
  "top_affected_areas",
  "damage_filter",
  "confidence_filter",
  "nearby_lookup",
  "general_knowledge",
];

/**
 * Converts user input into a structured intent (question type + params).
 * Uses keyword and pattern matching; returns unsupported for anything that
 * doesn't match a supported type.
 */
export function parseIntent(userInput: string): Intent {
  const text = (userInput || "").trim();
  const lower = text.toLowerCase();

  if (!text) {
    return { type: "unsupported", params: {} };
  }

  // Address lookup: "what's the damage at 501 River Rd", "address 100 Main St", "501 Coastal Hwy"
  const addressMatch = lower.match(
    /(?:address|at|for)\s+(.+?)(?:\?|$)|^(\d+\s+[\w\s]+(?:rd|st|ave|dr|hwy|road|street|avenue|drive|highway))(?:\?|$)/i
  );
  const addressPhrase = addressMatch ? (addressMatch[1] || addressMatch[2] || "").trim() : null;
  if (
    addressPhrase &&
    (lower.includes("address") || lower.includes("damage at") || lower.includes("what's at") || /^\d+\s+[\w\s]+(?:rd|st|ave|dr|hwy)/i.test(lower))
  ) {
    return { type: "address_lookup", params: { address: addressPhrase } };
  }

  // Street lookup: "damage on Main St", "River Rd", "street Oak Ave", "Harbor Dr"
  const streetMatch = lower.match(
    /(?:street|on|along)\s+(.+?)(?:\?|$)|(river\s+rd|main\s+st|oak\s+ave|harbor\s+dr|beach\s+st|coastal\s+hwy)/
  );
  const streetPhrase = streetMatch ? (streetMatch[1] || streetMatch[2] || streetMatch[0] || "").trim() : null;
  if (
    streetPhrase &&
    (lower.includes("street") || lower.includes("road") || lower.includes(" ave") || lower.includes(" dr") || lower.includes(" st") || lower.includes(" hwy") || lower.includes("damage on") || lower.includes("along ") || /(river rd|main st|oak ave|harbor dr|beach st|coastal hwy)/.test(lower))
  ) {
    const canonical = streetPhrase.replace(/\s+/g, " ");
    return { type: "street_lookup", params: { street: canonical } };
  }

  // Region summary: "region North", "South region", "summary for North", "damage in South"
  const regionMatch = lower.match(/(?:region|in|for)\s+(north|south|east|west)/) || lower.match(/(north|south|east|west)(?:\s+region|\s+summary)?/);
  const regionName = regionMatch ? (regionMatch[1] || "").trim() : null;
  if (
    regionName &&
    (lower.includes("region") || lower.includes("summary for") || lower.includes("damage in") || lower.includes("north") || lower.includes("south"))
  ) {
    return { type: "region_summary", params: { region: regionName } };
  }

  // Severity summary: "severity summary", "how many destroyed", "breakdown by severity", "damage levels"
  if (
    /severity|breakdown|damage\s+level|how\s+many\s+(destroyed|major|minor|no damage)|count\s+by\s+severity/i.test(lower)
  ) {
    return { type: "severity_summary", params: {} };
  }

  // Dataset summary: "overall summary", "dataset summary", "total records", "how many records"
  if (
    /overall|dataset\s+summary|total\s+records|how\s+many\s+records|number\s+of\s+(predictions|assessments)|full\s+summary/i.test(lower)
  ) {
    return { type: "dataset_summary", params: {} };
  }

  // Top affected areas: "top affected", "worst areas", "most damaged", "critical areas"
  if (
    /top\s+affected|worst\s+areas?|most\s+damaged|critical\s+areas?|highest\s+damage|priority\s+areas/i.test(lower)
  ) {
    return { type: "top_affected_areas", params: {} };
  }

  // ID lookup: "florence_1", "property florence_3", "id florence_8", "look up florence_5"
  const idMatch = lower.match(/(?:id|property|look\s*up)\s+(florence_\d+)/) || lower.match(/^(florence_\d+)$/);
  if (idMatch) {
    return { type: "id_lookup", params: { id: idMatch[1] } };
  }

  // Damage filter: "show all destroyed", "list major properties", "destroyed properties", "filter by minor"
  const damageFilterMatch = lower.match(
    /(?:show|list|filter|all|find|get)\s+(?:all\s+)?(destroyed|major|minor|no damage)\s*(?:properties|records|buildings)?/
  ) || lower.match(/(destroyed|major|minor|no damage)\s+(?:properties|records|buildings)/);
  if (damageFilterMatch) {
    return { type: "damage_filter", params: { damage_level: damageFilterMatch[1] } };
  }

  // Confidence filter: "properties above 90%", "confidence above 80", "high confidence", "records over 85%"
  const confMatch = lower.match(
    /(?:confidence|properties|records)\s+(?:above|over|>=?|greater\s+than)\s+(\d+)\s*%?/
  ) || lower.match(/(?:above|over)\s+(\d+)\s*%?\s*confidence/);
  if (confMatch) {
    return { type: "confidence_filter", params: { min_confidence: confMatch[1] } };
  }
  if (/high\s+confidence/i.test(lower)) {
    return { type: "confidence_filter", params: { min_confidence: "80" } };
  }

  // Nearby lookup: "properties near 501 River Rd", "nearby 100 Main St", "close to 410 Beach St"
  const nearbyMatch = lower.match(
    /(?:near|nearby|close\s+to|around|within)\s+(.+?)(?:\?|$)/
  );
  if (nearbyMatch && nearbyMatch[1].trim()) {
    return { type: "nearby_lookup", params: { address: nearbyMatch[1].trim() } };
  }

  // General knowledge: domain questions about the project, VLM, dataset, methodology
  if (
    /\bvlm\b|vision.?language|pipeline|xbd|dataset|classificat|methodolog|how\s+(does|do)\s+(the|this|your|damage)|what\s+(is|are)\s+(the|this|your|a)\s+(vlm|pipeline|dataset|model|system|dashboard|project|xbd|damage\s+class)|accuracy|precision|recall|fema|evaluation|how\s+accurate|how\s+many\s+buildings|satellite\s+imager|aerial\s+imager|ground.?truth|training\s+data|model\s+performance|damage\s+(types|levels|categories)|what\s+can\s+you\s+do|capabilities|how\s+does\s+this\s+work/i.test(lower)
  ) {
    return { type: "general_knowledge", params: {} };
  }

  return { type: "unsupported", params: {} };
}

export function isSupported(intent: Intent): boolean {
  return intent.type !== "unsupported" && SUPPORTED_TYPES.includes(intent.type);
}
