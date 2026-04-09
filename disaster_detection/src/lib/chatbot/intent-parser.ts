import type { Intent, QuestionType } from "./types";

const SUPPORTED_TYPES: QuestionType[] = [
  "address_lookup",
  "street_lookup",
  "region_summary",
  "severity_summary",
  "dataset_summary",
  "top_affected_areas",
  "stat_count",
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

  // Address lookup
  const addressMatch = lower.match(
    /(?:address|at|for)\s+(.+?)(?:\?|$)|^(\d+\s+[\w\s]+(?:rd|st|ave|dr|hwy|road|street|avenue|drive|highway))(?:\?|$)/i
  );
  const addressPhrase = addressMatch
    ? (addressMatch[1] || addressMatch[2] || "").trim()
    : null;

  if (
    addressPhrase &&
    (
      lower.includes("address") ||
      lower.includes("damage at") ||
      lower.includes("what's at") ||
      /^\d+\s+[\w\s]+(?:rd|st|ave|dr|hwy)/i.test(lower)
    )
  ) {
    return { type: "address_lookup", params: { address: addressPhrase } };
  }

  // Street lookup
  const streetMatch = lower.match(
    /(?:street|on|along)\s+(.+?)(?:\?|$)|(river\s+rd|main\s+st|oak\s+ave|harbor\s+dr|beach\s+st|coastal\s+hwy)/
  );
  const streetPhrase = streetMatch
    ? (streetMatch[1] || streetMatch[2] || streetMatch[0] || "").trim()
    : null;

  if (
    streetPhrase &&
    (
      lower.includes("street") ||
      lower.includes("road") ||
      lower.includes(" ave") ||
      lower.includes(" dr") ||
      lower.includes(" st") ||
      lower.includes(" hwy") ||
      lower.includes("damage on") ||
      lower.includes("along ") ||
      /(river rd|main st|oak ave|harbor dr|beach st|coastal hwy)/.test(lower)
    )
  ) {
    const canonical = streetPhrase.replace(/\s+/g, " ");
    return { type: "street_lookup", params: { street: canonical } };
  }

  // Region summary
  const regionMatch =
    lower.match(/(?:region|in|for)\s+(north|south|east|west)/) ||
    lower.match(/(north|south|east|west)(?:\s+region|\s+summary)?/);

  const regionName = regionMatch ? (regionMatch[1] || "").trim() : null;

  if (
    regionName &&
    (
      lower.includes("region") ||
      lower.includes("summary for") ||
      lower.includes("damage in") ||
      lower.includes("north") ||
      lower.includes("south")
    )
  ) {
    return { type: "region_summary", params: { region: regionName } };
  }

  // Statistical count
  const isCountQuestion = /how\s+many|count|number\s+of/.test(lower);

  if (isCountQuestion) {
    let damageLabel = "";
    let entity = "";

    if (/destroyed|destroy|red|highlighted in red|red highlighted/.test(lower)) {
      damageLabel = "destroyed";
    } else if (/\bmajor\b/.test(lower)) {
      damageLabel = "major";
    } else if (/\bminor\b/.test(lower)) {
      damageLabel = "minor";
    } else if (/no\s+damage|undamaged/.test(lower)) {
      damageLabel = "no damage";
    }

    if (/\bhouse\b|\bhouses\b|\bhome\b|\bhomes\b/.test(lower)) {
      entity = "houses";
    } else if (/\bbuilding\b|\bbuildings\b/.test(lower)) {
      entity = "buildings";
    } else if (/\bstructure\b|\bstructures\b/.test(lower)) {
      entity = "structures";
    }

    if (damageLabel || entity) {
      return {
        type: "stat_count",
        params: { damageLabel, entity },
      };
    }
  }

  // Severity summary
  if (
    /severity|breakdown\s+by\s+severity|damage\s+level|count\s+by\s+severity/i.test(lower)
  ) {
    return { type: "severity_summary", params: {} };
  }

  // Dataset summary
  if (
    /overall|dataset\s+summary|total\s+records|how\s+many\s+records|number\s+of\s+(predictions|assessments)|full\s+summary/i.test(lower)
  ) {
    return { type: "dataset_summary", params: {} };
  }

  // Top affected areas
  if (
    /top\s+affected|worst\s+areas?|most\s+damaged|critical\s+areas?|highest\s+damage|priority\s+areas/i.test(lower)
  ) {
    return { type: "top_affected_areas", params: {} };
  }

  return { type: "unsupported", params: {} };
}

export function isSupported(intent: Intent): boolean {
  return intent.type !== "unsupported" && SUPPORTED_TYPES.includes(intent.type);
}


// import type { Intent, QuestionType } from "./types";

// const SUPPORTED_TYPES: QuestionType[] = [
//   "address_lookup",
//   "street_lookup",
//   "region_summary",
//   "severity_summary",
//   "dataset_summary",
//   "top_affected_areas",
//   "stat_count",
// ];

// /**
//  * Converts user input into a structured intent (question type + params).
//  * Uses keyword and pattern matching; returns unsupported for anything that
//  * doesn't match a supported type.
//  */
// export function parseIntent(userInput: string): Intent {
//   const text = (userInput || "").trim();
//   const lower = text.toLowerCase();

//   if (!text) {
//     return { type: "unsupported", params: {} };
//   }

//   // Address lookup: "what's the damage at 501 River Rd", "address 100 Main St", "501 Coastal Hwy"
//   const addressMatch = lower.match(
//     /(?:address|at|for)\s+(.+?)(?:\?|$)|^(\d+\s+[\w\s]+(?:rd|st|ave|dr|hwy|road|street|avenue|drive|highway))(?:\?|$)/i
//   );
//   const addressPhrase = addressMatch ? (addressMatch[1] || addressMatch[2] || "").trim() : null;
//   if (
//     addressPhrase &&
//     (lower.includes("address") || lower.includes("damage at") || lower.includes("what's at") || /^\d+\s+[\w\s]+(?:rd|st|ave|dr|hwy)/i.test(lower))
//   ) {
//     return { type: "address_lookup", params: { address: addressPhrase } };
//   }

//   // Street lookup: "damage on Main St", "River Rd", "street Oak Ave", "Harbor Dr"
//   const streetMatch = lower.match(
//     /(?:street|on|along)\s+(.+?)(?:\?|$)|(river\s+rd|main\s+st|oak\s+ave|harbor\s+dr|beach\s+st|coastal\s+hwy)/
//   );
//   const streetPhrase = streetMatch ? (streetMatch[1] || streetMatch[2] || streetMatch[0] || "").trim() : null;
//   if (
//     streetPhrase &&
//     (lower.includes("street") || lower.includes("road") || lower.includes(" ave") || lower.includes(" dr") || lower.includes(" st") || lower.includes(" hwy") || lower.includes("damage on") || lower.includes("along ") || /(river rd|main st|oak ave|harbor dr|beach st|coastal hwy)/.test(lower))
//   ) {
//     const canonical = streetPhrase.replace(/\s+/g, " ");
//     return { type: "street_lookup", params: { street: canonical } };
//   }

//   // Region summary: "region North", "South region", "summary for North", "damage in South"
//   const regionMatch = lower.match(/(?:region|in|for)\s+(north|south|east|west)/) || lower.match(/(north|south|east|west)(?:\s+region|\s+summary)?/);
//   const regionName = regionMatch ? (regionMatch[1] || "").trim() : null;
//   if (
//     regionName &&
//     (lower.includes("region") || lower.includes("summary for") || lower.includes("damage in") || lower.includes("north") || lower.includes("south"))
//   ) {
//     return { type: "region_summary", params: { region: regionName } };
//   }

//   // Severity summary: "severity summary", "how many destroyed", "breakdown by severity", "damage levels"
//   if (
//     /severity|breakdown|damage\s+level|how\s+many\s+(destroyed|major|minor|no damage)|count\s+by\s+severity/i.test(lower)
//   ) {
//     return { type: "severity_summary", params: {} };
//   }

//   // Dataset summary: "overall summary", "dataset summary", "total records", "how many records"
//   if (
//     /overall|dataset\s+summary|total\s+records|how\s+many\s+records|number\s+of\s+(predictions|assessments)|full\s+summary/i.test(lower)
//   ) {
//     return { type: "dataset_summary", params: {} };
//   }

//   // Top affected areas: "top affected", "worst areas", "most damaged", "critical areas"
//   if (
//     /top\s+affected|worst\s+areas?|most\s+damaged|critical\s+areas?|highest\s+damage|priority\s+areas/i.test(lower)
//   ) {
//     return { type: "top_affected_areas", params: {} };
//   }

//   return { type: "unsupported", params: {} };
// }

// export function isSupported(intent: Intent): boolean {
//   return intent.type !== "unsupported" && SUPPORTED_TYPES.includes(intent.type);
// }