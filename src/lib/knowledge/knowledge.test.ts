import { describe, expect, it } from "vitest";

import { applySnippet, countWords, readingMinutes } from "@/lib/knowledge/notes";
import { fuzzyScore, searchKnowledge } from "@/lib/knowledge/search";
import {
  dueFlashcards,
  isFlashcardDue,
  knowledgeStats,
  topicTimeline,
} from "@/lib/knowledge/insights";
import type { Flashcard } from "@/lib/knowledge/types";
import type { PlannedTask } from "@/lib/planner/types";

const TOPIC = "prelims.gs.polity.constitution.fundamental-rights";

function card(patch: Partial<Flashcard>): Flashcard {
  return {
    id: "c1",
    topicId: TOPIC,
    front: "Q",
    back: "A",
    tags: [],
    difficulty: "medium",
    confidence: 3,
    lastReviewedAt: null,
    reviewCount: 0,
    correctStreak: 0,
    incorrectStreak: 0,
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    ai: null,
    ...patch,
  };
}

const emptySource = {
  richNotes: {},
  quickNotes: {},
  flashcards: {},
  keywords: {},
  bookRefs: {},
  resources: {},
  pyqs: {},
  currentAffairs: {},
};

describe("notes service", () => {
  it("counts words and estimates reading time", () => {
    expect(countWords("")).toBe(0);
    expect(countWords("one two   three\nfour")).toBe(4);
    expect(readingMinutes(0)).toBe(0);
    expect(readingMinutes(100)).toBe(1);
    expect(readingMinutes(1000)).toBe(5);
  });

  it("wraps selections and inserts blocks with sane caret positions", () => {
    const bold = applySnippet("hello world", 0, 5, "bold");
    expect(bold.text).toBe("**hello** world");
    expect(bold.text.slice(bold.selectionStart, bold.selectionEnd)).toBe("hello");

    const list = applySnippet("line", 4, 4, "list");
    expect(list.text).toBe("line\n- item\n");

    const callout = applySnippet("", 0, 0, "callout");
    expect(callout.text).toContain("> [!note]");
  });
});

describe("fuzzy search", () => {
  it("ranks substring > tokens > subsequence and rejects non-matches", () => {
    const exact = fuzzyScore("basic structure", "Basic Structure doctrine")!;
    const tokens = fuzzyScore("structure basic", "Basic Structure doctrine")!;
    const subsequence = fuzzyScore("bsdoc", "Basic Structure doctrine")!;
    expect(exact).toBeGreaterThan(tokens);
    expect(tokens).toBeGreaterThan(subsequence);
    expect(fuzzyScore("parliament", "Basic Structure doctrine")).toBeNull();
  });

  it("searches every knowledge type and honours filters", () => {
    const source = {
      ...emptySource,
      keywords: {
        k1: {
          id: "k1",
          topicId: TOPIC,
          term: "Kesavananda Bharati",
          kind: "case" as const,
          note: "",
          createdAt: "",
        },
      },
      pyqs: {
        p1: {
          id: "p1",
          topicId: TOPIC,
          linkedTopicIds: [],
          year: 2020,
          paper: "GS-II",
          question: "Discuss the Kesavananda Bharati verdict.",
          marks: 15,
          difficulty: "medium" as const,
          attempted: false,
          solved: false,
          note: "",
          expectedAnswer: "",
          aiExplanation: null,
          createdAt: "",
          updatedAt: "",
        },
      },
    };
    const all = searchKnowledge(source, "kesavananda");
    expect(all.some((hit) => hit.type === "keyword")).toBe(true);
    expect(all.some((hit) => hit.type === "pyq")).toBe(true);

    const onlyPyqs = searchKnowledge(source, "kesavananda", new Set(["pyq"]));
    expect(onlyPyqs.every((hit) => hit.type === "pyq")).toBe(true);

    // Syllabus topics are searchable through the same engine.
    const topics = searchKnowledge(emptySource, "fundamental rights");
    expect(topics.some((hit) => hit.type === "topic" && hit.topicId === TOPIC)).toBe(
      true,
    );
  });
});

describe("flashcard due logic and stats", () => {
  const now = new Date("2026-07-10T12:00:00.000Z");

  it("cards are due when unreviewed or stale", () => {
    expect(isFlashcardDue(card({}), now)).toBe(true);
    expect(
      isFlashcardDue(card({ lastReviewedAt: "2026-07-09T00:00:00.000Z" }), now),
    ).toBe(false);
    expect(
      isFlashcardDue(card({ lastReviewedAt: "2026-06-20T00:00:00.000Z" }), now),
    ).toBe(true);
    expect(
      dueFlashcards(
        { a: card({ id: "a" }), b: card({ id: "b", lastReviewedAt: "2026-07-09T00:00:00.000Z" }) },
        undefined,
        now,
      ),
    ).toHaveLength(1);
  });

  it("aggregates knowledge growth and writing statistics", () => {
    const stats = knowledgeStats({
      ...emptySource,
      richNotes: {
        [TOPIC]: {
          topicId: TOPIC,
          markdown: "one two three four five",
          createdAt: "",
          updatedAt: "",
          versionTimestamps: [],
          ai: {
            summary: null,
            quiz: null,
            explanation: null,
            difficultyEstimate: null,
            cleanup: null,
          },
        },
      },
      flashcards: { c1: card({}) },
      bookmarks: {},
    });
    expect(stats.notes).toBe(1);
    expect(stats.words).toBe(5);
    expect(stats.cards).toBe(1);
    expect(stats.dueCards).toBe(1);
    expect(stats.totalItems).toBe(2);
  });
});

describe("knowledge timeline", () => {
  it("merges knowledge events with completed planner sessions, newest first", () => {
    const events = [
      {
        id: "e1",
        topicId: TOPIC,
        at: "2026-07-02T10:00:00.000Z",
        type: "note-updated" as const,
        label: "Updated notes",
      },
      {
        id: "e2",
        topicId: "prelims.csat.comprehension",
        at: "2026-07-03T10:00:00.000Z",
        type: "keyword-added" as const,
        label: "elsewhere",
      },
    ];
    const tasks: PlannedTask[] = [
      {
        id: "t1",
        topicId: TOPIC,
        date: "2026-07-03",
        slot: "morning",
        minutes: 60,
        kind: "study",
        status: "completed",
        completedAt: "2026-07-03T08:00:00.000Z",
        createdBy: "auto",
      },
    ];
    const timeline = topicTimeline(TOPIC, events, tasks);
    expect(timeline).toHaveLength(2);
    expect(timeline[0].type).toBe("studied");
    expect(timeline[1].type).toBe("note-updated");
  });
});
