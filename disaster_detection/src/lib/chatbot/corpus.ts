import fs from "fs";
import path from "path";
import { buildIndex, score, type BM25Index } from "./bm25";

export type CorpusDoc = {
  id: string;
  /** Source .md file name (without extension). */
  file: string;
  /** Human-readable title from frontmatter. */
  title: string;
  /** Source label (FEMA, AP, NOAA, ...). */
  source: string;
  /** Publication date as ISO string, if available. */
  date?: string;
  /** Original URL for citation. */
  url?: string;
  /** The chunk text used for retrieval and for injection into the prompt. */
  text: string;
};

export type CorpusHit = CorpusDoc & { score: number };

type FrontmatterAndBody = {
  frontmatter: Record<string, string>;
  body: string;
};

function parseFrontmatter(raw: string): FrontmatterAndBody {
  // Accept YAML-like frontmatter fenced by `---` at the top.
  const fmMatch = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  if (!fmMatch) {
    return { frontmatter: {}, body: raw };
  }
  const [, fmBlock, body] = fmMatch;
  const frontmatter: Record<string, string> = {};
  for (const line of fmBlock.split("\n")) {
    const m = line.match(/^([A-Za-z_][\w-]*)\s*:\s*(.*)$/);
    if (!m) continue;
    const [, key, valRaw] = m;
    frontmatter[key.trim()] = valRaw.trim().replace(/^['"]|['"]$/g, "");
  }
  return { frontmatter, body };
}

/**
 * Split the body into paragraph-sized chunks, preserving the nearest preceding
 * markdown heading so each chunk has local context for retrieval.
 */
function chunkBody(body: string): string[] {
  const lines = body.split("\n");
  const chunks: string[] = [];
  let currentHeading = "";
  let buffer: string[] = [];

  const flush = () => {
    const text = buffer.join("\n").trim();
    if (text.length >= 40) {
      chunks.push(currentHeading ? `${currentHeading}\n\n${text}` : text);
    }
    buffer = [];
  };

  for (const line of lines) {
    const trimmed = line.trimEnd();
    if (/^#{1,6}\s+/.test(trimmed)) {
      flush();
      currentHeading = trimmed;
      continue;
    }
    if (trimmed === "") {
      flush();
      continue;
    }
    buffer.push(trimmed);
  }
  flush();
  return chunks;
}

let _cache: { docs: CorpusDoc[]; index: BM25Index } | null = null;

function loadCorpus(): { docs: CorpusDoc[]; index: BM25Index } {
  if (_cache) return _cache;
  const dir = path.join(process.cwd(), "src", "lib", "chatbot", "corpus");
  const docs: CorpusDoc[] = [];

  if (!fs.existsSync(dir)) {
    _cache = { docs, index: buildIndex([]) };
    return _cache;
  }

  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md"));
  for (const file of files) {
    const full = path.join(dir, file);
    const raw = fs.readFileSync(full, "utf8");
    const { frontmatter, body } = parseFrontmatter(raw);
    const chunks = chunkBody(body);
    const base = file.replace(/\.md$/, "");
    chunks.forEach((chunk, i) => {
      docs.push({
        id: `${base}#${i}`,
        file: base,
        title: frontmatter.title || base,
        source: frontmatter.source || "unknown",
        date: frontmatter.date,
        url: frontmatter.url,
        text: chunk,
      });
    });
  }

  const index = buildIndex(docs.map((d) => ({ id: d.id, text: d.text })));
  _cache = { docs, index };
  return _cache;
}

/**
 * Retrieve the top-K most relevant corpus chunks for a query via BM25.
 * Returns hits sorted by score descending. Safe to call on any query; returns
 * an empty list if nothing scores above zero.
 */
export function retrieveCorpus(query: string, k = 4): CorpusHit[] {
  const { docs, index } = loadCorpus();
  if (docs.length === 0) return [];
  const ranked = score(index, query, k);
  const byId = new Map(docs.map((d) => [d.id, d]));
  const hits: CorpusHit[] = [];
  for (const r of ranked) {
    const doc = byId.get(r.id);
    if (doc) hits.push({ ...doc, score: r.score });
  }
  return hits;
}

/**
 * Format retrieved corpus hits as a plain-text context block to splice into the
 * LLM prompt. Includes title, source, date, URL, and chunk text.
 */
export function formatCorpusForPrompt(hits: CorpusHit[]): string {
  if (hits.length === 0) return "";
  const parts = hits.map((h, i) => {
    const header = [
      `[${i + 1}] ${h.title}`,
      `Source: ${h.source}${h.date ? ` (${h.date})` : ""}`,
      h.url ? `URL: ${h.url}` : null,
    ]
      .filter(Boolean)
      .join("\n");
    return `${header}\n${h.text}`;
  });
  return parts.join("\n\n---\n\n");
}
