/**
 * Fetches real-time disaster information from external public APIs:
 *  - Wikipedia REST API  (no key required)
 *  - FEMA Open API       (no key required)
 *
 * Results are cached in-process for 10 minutes to avoid hammering
 * external services on repeated similar queries.
 */

export type WebSource = {
  title: string;
  url: string;
  snippet: string;
};

export type WebSearchResult = {
  query: string;
  sources: WebSource[];
  combinedText: string;
};

// ─── In-process cache ───────────────────────────────────────────────────────
const _cache = new Map<string, { result: WebSearchResult; ts: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export async function fetchExternalContext(
  query: string
): Promise<WebSearchResult> {
  const key = query.toLowerCase().trim();
  const hit = _cache.get(key);
  if (hit && Date.now() - hit.ts < CACHE_TTL_MS) return hit.result;

  const [wikiSettled, femaSettled] = await Promise.allSettled([
    searchWikipedia(query),
    fetchFEMAContext(query),
  ]);

  const sources: WebSource[] = [];
  const textParts: string[] = [];

  if (wikiSettled.status === "fulfilled" && wikiSettled.value) {
    sources.push(...wikiSettled.value.sources);
    textParts.push(wikiSettled.value.text);
  }
  if (femaSettled.status === "fulfilled" && femaSettled.value) {
    sources.push(...femaSettled.value.sources);
    textParts.push(femaSettled.value.text);
  }

  const result: WebSearchResult = {
    query,
    sources,
    combinedText: textParts.filter(Boolean).join("\n\n---\n\n"),
  };
  _cache.set(key, { result, ts: Date.now() });
  return result;
}

// ─── Wikipedia ───────────────────────────────────────────────────────────────

async function searchWikipedia(
  query: string
): Promise<{ sources: WebSource[]; text: string } | null> {
  try {
    // Bias search toward disaster/hurricane/flood topics
    const enriched = `${query} disaster hurricane flood FEMA`;
    const searchUrl =
      `https://en.wikipedia.org/w/api.php?action=query&list=search` +
      `&srsearch=${encodeURIComponent(enriched)}&format=json&utf8=1&srlimit=3&origin=*`;

    const searchRes = await fetch(searchUrl, {
      signal: AbortSignal.timeout(6000),
      headers: { "User-Agent": "DisasterAssessmentBot/1.0" },
    });
    if (!searchRes.ok) return null;
    const searchData = await searchRes.json();

    const hits: { title: string; snippet: string }[] =
      searchData?.query?.search ?? [];
    if (hits.length === 0) return null;

    // Fetch full summary for the top hit
    const top = hits[0];
    const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
      top.title.replace(/ /g, "_")
    )}`;
    const summaryRes = await fetch(summaryUrl, {
      signal: AbortSignal.timeout(6000),
      headers: { "User-Agent": "DisasterAssessmentBot/1.0" },
    });

    let extract = top.snippet.replace(/<[^>]+>/g, "");
    if (summaryRes.ok) {
      const summaryJson = await summaryRes.json();
      extract = summaryJson?.extract ?? extract;
    }

    const sources: WebSource[] = [
      {
        title: top.title,
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(
          top.title.replace(/ /g, "_")
        )}`,
        snippet: extract.slice(0, 300),
      },
    ];

    // Include brief snippets from additional hits as secondary sources
    for (const hit of hits.slice(1)) {
      sources.push({
        title: hit.title,
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(
          hit.title.replace(/ /g, "_")
        )}`,
        snippet: hit.snippet.replace(/<[^>]+>/g, "").slice(0, 200),
      });
    }

    return {
      sources,
      text: `## Wikipedia — ${top.title}\n${extract}`,
    };
  } catch {
    return null;
  }
}

// ─── FEMA Open API ───────────────────────────────────────────────────────────

async function fetchFEMAContext(
  query: string
): Promise<{ sources: WebSource[]; text: string } | null> {
  try {
    const lower = query.toLowerCase();
    const isMatthew = /matthew/i.test(lower);
    const isFlood = /flood/i.test(lower) && !/hurricane|typhoon|cyclone/i.test(lower);

    let incidentTypeFilter: string;
    if (isMatthew) {
      incidentTypeFilter = "disasterName eq 'HURRICANE MATTHEW'";
    } else if (isFlood) {
      incidentTypeFilter = "incidentType eq 'Flood'";
    } else {
      incidentTypeFilter = "incidentType eq 'Hurricane'";
    }

    const apiUrl =
      `https://www.fema.gov/api/open/v2/disasterDeclarations` +
      `?$filter=${encodeURIComponent(incidentTypeFilter)}` +
      `&$orderby=declarationDate+desc&$top=6&$format=json`;

    const res = await fetch(apiUrl, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const data = await res.json();

    const declarations: Record<string, string>[] =
      data?.DisasterDeclarations ?? [];
    if (declarations.length === 0) return null;

    const lines = declarations.map(
      (d) =>
        `- ${d.declarationTitle ?? "Unknown"} [${d.state ?? ""}] — declared ${
          d.declarationDate?.slice(0, 10) ?? "unknown"
        }, incident type: ${d.incidentType ?? "unknown"}`
    );

    const sources: WebSource[] = [
      {
        title: "FEMA Disaster Declarations",
        url: "https://www.fema.gov/disaster/declarations",
        snippet: `${declarations.length} FEMA disaster declarations retrieved`,
      },
    ];

    return {
      sources,
      text: `## FEMA Official Disaster Declarations\n${lines.join("\n")}\n\nSource: FEMA Open Government Data (fema.gov/api)`,
    };
  } catch {
    return null;
  }
}
