import Fuse from "fuse.js";
import {
  ATTACK_MODE_CHUNKS,
  type AttackModeChunk,
  type AttackModeSearchResult,
} from "@/content/attack-mode";

const SNIPPET_RADIUS = 90;

type SearchDocument = AttackModeChunk & {
  searchBody: string;
};

const documents: SearchDocument[] = ATTACK_MODE_CHUNKS.map((chunk) => ({
  ...chunk,
  searchBody: [chunk.title, chunk.module, chunk.section, chunk.tags.join(" "), chunk.content]
    .join("\n")
    .replace(/^##\s+/gm, "")
    .replace(/\*\*/g, ""),
}));

const fuse = new Fuse(documents, {
  keys: [
    { name: "title", weight: 0.35 },
    { name: "tags", weight: 0.25 },
    { name: "module", weight: 0.15 },
    { name: "section", weight: 0.1 },
    { name: "content", weight: 0.15 },
  ],
  threshold: 0.38,
  includeScore: true,
  includeMatches: true,
  ignoreLocation: true,
  minMatchCharLength: 2,
});

function stripMarkdown(text: string): string {
  return text
    .replace(/^##\s+/gm, "")
    .replace(/\*\*/g, "")
    .replace(/\n+/g, " ")
    .trim();
}

function buildSnippet(chunk: AttackModeChunk, query: string): string {
  const plain = stripMarkdown(chunk.content);
  const q = query.trim().toLowerCase();
  if (!q) return plain.slice(0, SNIPPET_RADIUS * 2) + (plain.length > SNIPPET_RADIUS * 2 ? "…" : "");

  const terms = q.split(/\s+/).filter(Boolean);
  let bestIndex = -1;

  for (const term of terms) {
    const idx = plain.toLowerCase().indexOf(term);
    if (idx !== -1 && (bestIndex === -1 || idx < bestIndex)) bestIndex = idx;
  }

  if (bestIndex === -1) {
    return plain.slice(0, SNIPPET_RADIUS * 2) + (plain.length > SNIPPET_RADIUS * 2 ? "…" : "");
  }

  const start = Math.max(0, bestIndex - SNIPPET_RADIUS);
  const end = Math.min(plain.length, bestIndex + SNIPPET_RADIUS);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < plain.length ? "…" : "";
  return prefix + plain.slice(start, end) + suffix;
}

function highlightSnippet(snippet: string, query: string): { text: string; match: boolean }[] {
  const terms = query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length >= 2);
  if (terms.length === 0) return [{ text: snippet, match: false }];

  const pattern = new RegExp(`(${terms.map(escapeRegex).join("|")})`, "gi");
  const parts = snippet.split(pattern).filter(Boolean);

  return parts.map((part) => ({
    text: part,
    match: terms.some((t) => part.toLowerCase() === t),
  }));
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function searchAttackMode(query: string, limit = 12): AttackModeSearchResult[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const results = fuse.search(trimmed, { limit });

  return results.map((result) => {
    const chunk = result.item;
    const snippet = buildSnippet(chunk, trimmed);
    return {
      chunk,
      score: result.score ?? 1,
      snippet,
      matchIndices: result.matches?.flatMap((m) => m.indices?.map(([s]) => s) ?? []) ?? [],
    };
  });
}

export function highlightQueryInSnippet(
  snippet: string,
  query: string,
): { text: string; match: boolean }[] {
  return highlightSnippet(snippet, query);
}

export function getAllTags(): string[] {
  const tags = new Set<string>();
  for (const chunk of ATTACK_MODE_CHUNKS) {
    for (const tag of chunk.tags) tags.add(tag);
  }
  return [...tags].sort();
}
