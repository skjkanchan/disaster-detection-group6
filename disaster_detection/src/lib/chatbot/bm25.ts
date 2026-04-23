/**
 * Tiny, dependency-free BM25 implementation for in-memory retrieval over a
 * small curated corpus. Good enough for a few hundred chunks; not tuned for
 * production-scale search.
 */

const STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "but", "by", "for", "from", "had",
  "has", "have", "he", "her", "hers", "him", "his", "i", "if", "in", "into",
  "is", "it", "its", "of", "on", "or", "our", "she", "so", "such", "that",
  "the", "their", "them", "they", "this", "to", "was", "we", "were", "what",
  "when", "where", "which", "who", "will", "with", "you", "your",
]);

export function tokenize(text: string): string[] {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

export type BM25Doc = {
  id: string;
  tokens: string[];
  length: number;
};

export type BM25Index = {
  docs: BM25Doc[];
  avgdl: number;
  /** Document frequency for each term (how many docs contain it). */
  df: Map<string, number>;
  /** Total number of documents. */
  n: number;
};

export function buildIndex(docs: { id: string; text: string }[]): BM25Index {
  const compiled: BM25Doc[] = docs.map((d) => {
    const tokens = tokenize(d.text);
    return { id: d.id, tokens, length: tokens.length };
  });
  const df = new Map<string, number>();
  for (const doc of compiled) {
    const seen = new Set<string>();
    for (const tok of doc.tokens) {
      if (seen.has(tok)) continue;
      seen.add(tok);
      df.set(tok, (df.get(tok) ?? 0) + 1);
    }
  }
  const totalLen = compiled.reduce((sum, d) => sum + d.length, 0);
  const avgdl = compiled.length > 0 ? totalLen / compiled.length : 0;
  return { docs: compiled, avgdl, df, n: compiled.length };
}

/**
 * Compute BM25 scores for a query against the index. Returns top-k document ids
 * and their raw scores, sorted descending.
 */
export function score(
  index: BM25Index,
  query: string,
  k = 5,
  params: { k1?: number; b?: number } = {}
): { id: string; score: number }[] {
  const k1 = params.k1 ?? 1.5;
  const b = params.b ?? 0.75;
  const qTokens = tokenize(query);
  if (qTokens.length === 0 || index.n === 0) return [];

  // Precompute IDF for each query token.
  const idf = new Map<string, number>();
  for (const t of qTokens) {
    const n_qi = index.df.get(t) ?? 0;
    // BM25+ style IDF with +1 smoothing to avoid negative values.
    const value = Math.log(1 + (index.n - n_qi + 0.5) / (n_qi + 0.5));
    idf.set(t, value);
  }

  const results: { id: string; score: number }[] = [];
  for (const doc of index.docs) {
    // Term frequencies in this doc.
    const tf = new Map<string, number>();
    for (const t of doc.tokens) tf.set(t, (tf.get(t) ?? 0) + 1);

    let s = 0;
    for (const q of qTokens) {
      const f = tf.get(q) ?? 0;
      if (f === 0) continue;
      const numerator = f * (k1 + 1);
      const denom =
        f + k1 * (1 - b + (b * doc.length) / (index.avgdl || 1));
      s += (idf.get(q) ?? 0) * (numerator / denom);
    }
    if (s > 0) results.push({ id: doc.id, score: s });
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, k);
}
