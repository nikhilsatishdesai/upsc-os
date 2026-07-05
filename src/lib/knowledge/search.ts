import { getAllNodes, getNode, isLeaf } from "@/lib/syllabus";
import type {
  BookReference,
  CurrentAffair,
  Flashcard,
  Keyword,
  Pyq,
  QuickNote,
  Resource,
  RichNote,
} from "./types";

/**
 * Knowledge search: one instant, fuzzy index across everything the user
 * knows. Pure functions — the palette feeds store slices in and renders
 * hits out.
 */

export type KnowledgeHitType =
  | "topic"
  | "note"
  | "quick-note"
  | "keyword"
  | "flashcard"
  | "pyq"
  | "resource"
  | "current-affair"
  | "book";

export const HIT_TYPE_LABELS: Record<KnowledgeHitType, string> = {
  topic: "Topics",
  note: "Notes",
  "quick-note": "Quick notes",
  keyword: "Keywords",
  flashcard: "Flashcards",
  pyq: "PYQs",
  resource: "Resources",
  "current-affair": "Current affairs",
  book: "Books",
};

export type KnowledgeHit = {
  type: KnowledgeHitType;
  /** Primary display line. */
  title: string;
  /** Context line (usually the topic path). */
  subtitle: string;
  /** Navigation target. */
  topicId: string;
  score: number;
};

/**
 * Fuzzy match score; null = no match. Tiered and transparent:
 *  3 — exact substring of the text;
 *  2 — every query token appears somewhere;
 *  1 — query is a character subsequence (typo-tolerant "fzy" match).
 * Earlier matches nudge the score slightly higher.
 */
export function fuzzyScore(query: string, text: string): number | null {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  if (q === "") return null;

  const index = t.indexOf(q);
  if (index >= 0) return 3 + Math.max(0, 1 - index / 100);

  const tokens = q.split(/\s+/).filter(Boolean);
  if (tokens.length > 1 && tokens.every((token) => t.includes(token))) {
    return 2;
  }

  let position = 0;
  for (const char of q) {
    if (char === " ") continue;
    position = t.indexOf(char, position);
    if (position === -1) return null;
    position += 1;
  }
  return 1;
}

type SearchSource = {
  richNotes: Record<string, RichNote>;
  quickNotes: Record<string, QuickNote>;
  flashcards: Record<string, Flashcard>;
  keywords: Record<string, Keyword>;
  bookRefs: Record<string, BookReference>;
  resources: Record<string, Resource>;
  pyqs: Record<string, Pyq>;
  currentAffairs: Record<string, CurrentAffair>;
};

const topicPath = (topicId: string): string =>
  getNode(topicId)?.pathTitles.join(" · ") ?? "";
const topicTitle = (topicId: string): string =>
  getNode(topicId)?.title ?? topicId;

const leafNodes = getAllNodes().filter(isLeaf);

/**
 * Search all knowledge (and the syllabus itself). `filters` empty/omitted
 * means "everything". Results come back best-first, capped.
 */
export function searchKnowledge(
  source: SearchSource,
  query: string,
  filters: Set<KnowledgeHitType> = new Set(),
  limit = 20,
): KnowledgeHit[] {
  const q = query.trim();
  if (q === "") return [];
  const active = (type: KnowledgeHitType) =>
    filters.size === 0 || filters.has(type);
  const hits: KnowledgeHit[] = [];

  const push = (
    type: KnowledgeHitType,
    text: string,
    topicId: string,
    subtitle?: string,
    weight = 1,
  ) => {
    const score = fuzzyScore(q, text);
    if (score !== null) {
      hits.push({
        type,
        title: text.length > 90 ? `${text.slice(0, 89)}…` : text,
        subtitle: subtitle ?? topicPath(topicId),
        topicId,
        score: score * weight,
      });
    }
  };

  if (active("topic")) {
    for (const node of leafNodes) {
      push("topic", node.title, node.id, node.pathTitles.join(" · "), 1.2);
    }
  }
  if (active("note")) {
    for (const note of Object.values(source.richNotes)) {
      const score = fuzzyScore(q, note.markdown);
      if (score !== null) {
        hits.push({
          type: "note",
          title: `Notes: ${topicTitle(note.topicId)}`,
          subtitle: topicPath(note.topicId),
          topicId: note.topicId,
          score,
        });
      }
    }
  }
  if (active("quick-note")) {
    for (const note of Object.values(source.quickNotes)) {
      push("quick-note", note.text, note.topicId);
    }
  }
  if (active("keyword")) {
    for (const keyword of Object.values(source.keywords)) {
      push("keyword", keyword.term, keyword.topicId, undefined, 1.1);
    }
  }
  if (active("flashcard")) {
    for (const card of Object.values(source.flashcards)) {
      push("flashcard", `${card.front} — ${card.back}`, card.topicId);
    }
  }
  if (active("pyq")) {
    for (const pyq of Object.values(source.pyqs)) {
      push(
        "pyq",
        pyq.question,
        pyq.topicId,
        `${pyq.year} · ${pyq.paper} · ${topicTitle(pyq.topicId)}`,
      );
    }
  }
  if (active("resource")) {
    for (const resource of Object.values(source.resources)) {
      push("resource", resource.title, resource.topicId);
    }
  }
  if (active("current-affair")) {
    for (const affair of Object.values(source.currentAffairs)) {
      push(
        "current-affair",
        `${affair.title} ${affair.summary}`.trim(),
        affair.topicIds[0],
      );
    }
  }
  if (active("book")) {
    for (const ref of Object.values(source.bookRefs)) {
      push(
        "book",
        `${ref.book}${ref.chapter ? ` · ${ref.chapter}` : ""}`,
        ref.topicId,
      );
    }
  }

  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}
