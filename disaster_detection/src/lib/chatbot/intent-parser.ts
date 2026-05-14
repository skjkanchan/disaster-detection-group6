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
  "external_knowledge",
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

  // Selected tile/zone query: "tell me about this tile", "damage in this zone", "what's here"
  // Also: compare queries referencing previous tiles in chat history
  // Must come first to prevent these from being captured as street/region lookups
  if (
    /\b(this\s+tile|this\s+zone|this\s+area|this\s+region|current\s+zone|current\s+tile|selected\s+zone|selected\s+tile|selected\s+area|in\s+this\s+zone|on\s+this\s+tile|about\s+this\s+(tile|zone|area)|damage\s+here|what.s\s+here|tell\s+me\s+about\s+(the\s+)?damage\s+(on|in)\s+this)\b/i.test(lower) ||
    /\b(compare|contrast|difference\s+between|versus|vs\.?)\b.*(tile|zone|area|damage|previous)/i.test(lower) ||
    /\b(previous|last|prior)\s+(tile|zone|area|damage\s+data)/i.test(lower)
  ) {
    return { type: "severity_summary", params: {} };
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

  // Street lookup: "damage on Main St", "River Rd", "street Oak Ave", "Harbor Dr",
  //                "damage on Route Nationale # 2", "buildings on Rue Émile Roumer"
  const streetMatch = lower.match(
    /(?:street|on|along)\s+(.+?)(?:\?|$)|(river\s+rd|main\s+st|oak\s+ave|harbor\s+dr|beach\s+st|coastal\s+hwy)/
  ) || lower.match(/(?:rue|route|avenue|boulevard|blvd)\s+[^\?]+/i);
  const streetPhrase = streetMatch ? (streetMatch[1] || streetMatch[2] || streetMatch[0] || "").trim() : null;
  if (
    streetPhrase &&
    (lower.includes("street") || lower.includes("road") || lower.includes(" ave") || lower.includes(" dr") || lower.includes(" st") || lower.includes(" hwy") || lower.includes("damage on") || lower.includes("along ") || /(river rd|main st|oak ave|harbor dr|beach st|coastal hwy)/.test(lower) || /\b(rue|route|avenue|boulevard)\b/i.test(lower))
  ) {
    const canonical = streetPhrase.replace(/\s+/g, " ");
    return { type: "street_lookup", params: { street: canonical } };
  }

  // Region summary: "region North", "South region", "summary for North", "damage in South",
  //                 "summary for Département du Sud", "buildings in Grande-Anse"
  const regionMatch =
    lower.match(/(?:summary\s+for|damage\s+in|buildings\s+in)\s+([^\?]+)/i) ||
    lower.match(/(?:region|in|for)\s+(north|south|east|west)/) ||
    lower.match(/(north|south|east|west)(?:\s+region|\s+summary)?/);
  const regionName = regionMatch ? (regionMatch[1] || regionMatch[0] || "").trim() : null;
  if (
    regionName &&
    (lower.includes("region") || lower.includes("summary for") || lower.includes("damage in") ||
     lower.includes("buildings in") || lower.includes("north") || lower.includes("south") ||
     /d[eé]partement/i.test(lower) || lower.includes("grande-anse") || lower.includes("grande anse"))
  ) {
    return { type: "region_summary", params: { region: regionName } };
  }

  // Severity summary: "severity summary", "how many destroyed", "breakdown by severity", "damage levels"
  if (
    /severity|breakdown|damage\s+level|how\s+many\s+(destroyed|major|minor|no damage)|count\s+by\s+severity/i.test(lower)
  ) {
    return { type: "severity_summary", params: {} };
  }

  // Dataset summary: "overall summary", "dataset summary", "total records", "how many records/houses/buildings"
  if (
    /overall|dataset\s+summary|total\s+(records|properties|buildings|houses|damage)|how\s+many\s+(records|properties|buildings|houses|were\s+damaged|in\s+total)|number\s+of\s+(predictions|assessments|properties|buildings|houses)|full\s+summary|damaged\s+in\s+total|total\s+damage/i.test(lower)
  ) {
    return { type: "dataset_summary", params: {} };
  }

  // Least damaged: "which houses have the least damage", "least damaged", "safest properties"
  if (
    /least\s+damage|least\s+damaged|safest|least\s+affected|no\s+damage\s+(house|propert|building)|which\s+(house|propert|building)\S*\s+(had|has|have|with)\s+(the\s+)?(least|lowest|minimal)/i.test(lower)
  ) {
    return { type: "damage_filter", params: { damage_level: "no damage" } };
  }

  // Most damaged: "which house had the most damage", "most damaged property", "worst property"
  if (
    /which\s+(house|propert|building)\S*\s+(had|has|have|with)\s+(the\s+)?(most|worst|highest)|most\s+damage[d]?\s+(house|propert|building)|worst\s+(damaged?\s+)?(house|propert|building)|highest\s+damage\s+(house|propert|building)/i.test(lower)
  ) {
    return { type: "damage_filter", params: { damage_level: "destroyed" } };
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

  // External knowledge: real-world facts that should be fetched from external sources
  // (FEMA, Wikipedia). Distinct from general_knowledge (which covers THIS project/dataset).
  const EXTERNAL_TRIGGERS =
    /\bfema\b|federal\s+emergency|national\s+flood|nfip|disaster\s+declaration|relief\s+fund|disaster\s+aid|aid\s+distribution|red\s+cross|world\s+food|humanitarian|evacuat|shelter.in.place|preparedness|emergency\s+kit|go.?bag|disaster\s+plan|response\s+protocol|early\s+warning|death\s+toll|casualt|fatali|injuries|people\s+died|how\s+many\s+(died|killed|dead|missing|displaced|homeless|affected\s+people)|damage\s+cost|\$[\d.]+\s*(billion|million)|economic\s+(loss|damage|impact)|insurance\s+claim|category\s+[1-5]|category\s+(one|two|three|four|five)|wind\s+speed|storm\s+surge|rainfall|flooding\s+history|historical\s+disaster|which\s+year|when\s+did|how\s+bad|how\s+severe|major\s+hurricane|worst\s+hurricane|deadliest|costliest|according\s+to|reports\s+say|statistics\s+show|officially|government\s+(report|data|statistic)|united\s+nations|world\s+bank/i;

  if (EXTERNAL_TRIGGERS.test(lower)) {
    return { type: "external_knowledge", params: { query: userInput } };
  }

  // General knowledge: any question that's disaster/damage/dataset related
  // but didn't match a specific intent above
  const DISASTER_KEYWORDS =
    /damag|destroy|hurricane|disaster|flood|storm|building|house|propert|structur|roof|collapse|assess|predict|classif|severity|confidence|geospatial|satellite|aerial|imager|vlm|vision.?language|pipeline|xbd|dataset|methodolog|accuracy|precision|recall|fema|evaluation|ground.?truth|model|heatmap|dashboard|region|street|address|affected|impact|casualt|emergency|response|recovery|inspect/i;
  if (DISASTER_KEYWORDS.test(lower)) {
    return { type: "general_knowledge", params: {} };
  }

  return { type: "unsupported", params: {} };
}

export function isSupported(intent: Intent): boolean {
  return intent.type !== "unsupported" && SUPPORTED_TYPES.includes(intent.type);
}