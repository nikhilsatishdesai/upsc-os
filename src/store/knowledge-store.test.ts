import { beforeEach, describe, expect, it, vi } from "vitest";

function createMemoryStorage(): Storage {
  let data: Record<string, string> = {};
  return {
    get length() {
      return Object.keys(data).length;
    },
    key: (i: number) => Object.keys(data)[i] ?? null,
    getItem: (k: string) => data[k] ?? null,
    setItem: (k: string, v: string) => {
      data[k] = v;
    },
    removeItem: (k: string) => {
      delete data[k];
    },
    clear: () => {
      data = {};
    },
  };
}
vi.stubGlobal("localStorage", createMemoryStorage());

const { useKnowledgeStore, sanitizeKnowledgeExport, BUILTIN_COLLECTIONS } =
  await import("@/store/knowledge-store");
const { exportStateToJSON, parseExportedState } = await import(
  "@/store/app-store"
);
const { KNOWLEDGE_CONFIG } = await import("@/lib/knowledge/config");

const TOPIC = "prelims.gs.polity.constitution.fundamental-rights";
const OTHER = "prelims.gs.economy.basics.inflation";

describe("rich notes", () => {
  beforeEach(() => useKnowledgeStore.getState().resetKnowledge());

  it("creates a note with AI placeholders and updates it in place", () => {
    useKnowledgeStore.getState().saveRichNote(TOPIC, "# FR\nArticle 14…");
    const note = useKnowledgeStore.getState().richNotes[TOPIC];
    expect(note.markdown).toContain("Article 14");
    expect(note.ai).toEqual({
      summary: null,
      quiz: null,
      explanation: null,
      difficultyEstimate: null,
      cleanup: null,
    });
    expect(note.versionTimestamps).toHaveLength(1);

    // An immediate auto-save updates content without a new version stamp.
    useKnowledgeStore.getState().saveRichNote(TOPIC, "# FR v2");
    const updated = useKnowledgeStore.getState().richNotes[TOPIC];
    expect(updated.markdown).toBe("# FR v2");
    expect(updated.versionTimestamps).toHaveLength(1);
  });

  it("logs a timeline event when notes begin", () => {
    useKnowledgeStore.getState().saveRichNote(TOPIC, "hello");
    const events = useKnowledgeStore.getState().events;
    expect(events.some((e) => e.type === "note-updated" && e.topicId === TOPIC)).toBe(
      true,
    );
  });
});

describe("flashcards", () => {
  beforeEach(() => useKnowledgeStore.getState().resetKnowledge());

  it("tracks review counts and streaks", () => {
    useKnowledgeStore
      .getState()
      .addFlashcard(TOPIC, { front: "Article 32?", back: "Right to remedies" });
    const id = Object.keys(useKnowledgeStore.getState().flashcards)[0];

    useKnowledgeStore.getState().reviewFlashcard(id, true);
    useKnowledgeStore.getState().reviewFlashcard(id, true);
    let card = useKnowledgeStore.getState().flashcards[id];
    expect(card.reviewCount).toBe(2);
    expect(card.correctStreak).toBe(2);
    expect(card.incorrectStreak).toBe(0);
    expect(card.lastReviewedAt).not.toBeNull();

    useKnowledgeStore.getState().reviewFlashcard(id, false);
    card = useKnowledgeStore.getState().flashcards[id];
    expect(card.correctStreak).toBe(0);
    expect(card.incorrectStreak).toBe(1);
    expect(card.ai).toBeNull(); // future SRS/AI extension point stays open
  });
});

describe("bookmarks and collections", () => {
  beforeEach(() => useKnowledgeStore.getState().resetKnowledge());

  it("ships built-in collections and protects them from deletion", () => {
    const collections = useKnowledgeStore.getState().collections;
    for (const builtin of BUILTIN_COLLECTIONS) {
      expect(collections[builtin.id]).toBeDefined();
    }
    useKnowledgeStore.getState().removeCollection("col-must-revise");
    expect(
      useKnowledgeStore.getState().collections["col-must-revise"],
    ).toBeDefined();
  });

  it("bookmarks a topic once per collection; deleting a custom collection removes its bookmarks", () => {
    const store = useKnowledgeStore.getState();
    store.addBookmark("topic", TOPIC, TOPIC, "col-must-revise");
    store.addBookmark("topic", TOPIC, TOPIC, "col-must-revise");
    expect(Object.keys(useKnowledgeStore.getState().bookmarks)).toHaveLength(1);

    useKnowledgeStore.getState().addCollection("Mains 2027");
    const custom = Object.values(useKnowledgeStore.getState().collections).find(
      (c) => !c.builtin,
    )!;
    useKnowledgeStore.getState().addBookmark("topic", OTHER, OTHER, custom.id);
    expect(Object.keys(useKnowledgeStore.getState().bookmarks)).toHaveLength(2);

    useKnowledgeStore.getState().removeCollection(custom.id);
    expect(Object.keys(useKnowledgeStore.getState().bookmarks)).toHaveLength(1);
  });
});

describe("PYQs and current affairs", () => {
  beforeEach(() => useKnowledgeStore.getState().resetKnowledge());

  it("marks a PYQ solved exactly once on the timeline", () => {
    useKnowledgeStore.getState().addPyq(TOPIC, {
      year: 2019,
      paper: "Prelims GS",
      question: "Which article guarantees constitutional remedies?",
    });
    const id = Object.keys(useKnowledgeStore.getState().pyqs)[0];
    useKnowledgeStore.getState().updatePyq(id, { solved: true });
    useKnowledgeStore.getState().updatePyq(id, { note: "easy" });
    const solvedEvents = useKnowledgeStore
      .getState()
      .events.filter((e) => e.type === "pyq-solved");
    expect(solvedEvents).toHaveLength(1);
    expect(useKnowledgeStore.getState().pyqs[id].aiExplanation).toBeNull();
  });

  it("links one current affair to multiple topics", () => {
    useKnowledgeStore.getState().addCurrentAffair({
      title: "New Supreme Court ruling on Article 21",
      topicIds: [TOPIC, OTHER],
      importance: "high",
    });
    const affair = Object.values(useKnowledgeStore.getState().currentAffairs)[0];
    expect(affair.topicIds).toEqual([TOPIC, OTHER]);
    const linkEvents = useKnowledgeStore
      .getState()
      .events.filter((e) => e.type === "current-affair-linked");
    expect(linkEvents.map((e) => e.topicId).sort()).toEqual(
      [TOPIC, OTHER].sort(),
    );
  });
});

describe("timeline cap", () => {
  beforeEach(() => useKnowledgeStore.getState().resetKnowledge());

  it("prunes the oldest events past the cap", () => {
    const extra = 30;
    for (let i = 0; i < KNOWLEDGE_CONFIG.timelineEventCap + extra; i++) {
      useKnowledgeStore.getState().addKeyword(TOPIC, `term-${i}`, "concept");
    }
    const events = useKnowledgeStore.getState().events;
    expect(events).toHaveLength(KNOWLEDGE_CONFIG.timelineEventCap);
    expect(events[0].label).toBe(`term-${extra}`);
  });
});

describe("backup round-trip (current format)", () => {
  beforeEach(() => useKnowledgeStore.getState().resetKnowledge());

  it("includes knowledge in exports and restores it on import", () => {
    useKnowledgeStore.getState().saveRichNote(TOPIC, "# My notes");
    useKnowledgeStore.getState().addFlashcard(TOPIC, { front: "Q", back: "A" });

    const parsed = parseExportedState(exportStateToJSON());
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.data.version).toBe(6);
    expect(parsed.data.knowledge?.richNotes[TOPIC].markdown).toBe("# My notes");

    useKnowledgeStore.getState().resetKnowledge();
    useKnowledgeStore.getState().importKnowledge(parsed.data.knowledge!);
    expect(Object.keys(useKnowledgeStore.getState().flashcards)).toHaveLength(1);
  });

  it("accepts pre-knowledge backups (v4) with knowledge = null", () => {
    const v4 = JSON.stringify({
      app: "upsc-os",
      version: 4,
      exportedAt: "2026-07-05T00:00:00.000Z",
      topics: {},
      displayName: "Nikhil",
      examDate: "2027-05-30",
      recentTopics: [],
      planner: null,
      tasks: {},
      lastPlannedAt: null,
      snapshots: {},
    });
    const parsed = parseExportedState(v4);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.data.knowledge).toBeNull();
  });

  it("sanitization drops entities pointing at unknown topics", () => {
    const dirty = sanitizeKnowledgeExport({
      richNotes: {
        [TOPIC]: { markdown: "keep me" },
        "no.such.topic": { markdown: "drop me" },
      },
      flashcards: {
        good: { topicId: TOPIC, front: "Q", back: "A" },
        bad: { topicId: "no.such.topic", front: "Q", back: "A" },
        empty: { topicId: TOPIC, front: "", back: "A" },
      },
      currentAffairs: {
        ok: { title: "T", topicIds: [TOPIC, "no.such.topic"] },
        orphan: { title: "T2", topicIds: ["no.such.topic"] },
      },
      bookmarks: {
        ok: { targetType: "topic", targetId: TOPIC, topicId: TOPIC, collectionId: "col-must-revise" },
        badCollection: { targetType: "topic", targetId: TOPIC, topicId: TOPIC, collectionId: "nope" },
      },
    });
    expect(Object.keys(dirty.richNotes)).toEqual([TOPIC]);
    expect(Object.keys(dirty.flashcards)).toEqual(["good"]);
    expect(dirty.currentAffairs.ok.topicIds).toEqual([TOPIC]);
    expect(dirty.currentAffairs.orphan).toBeUndefined();
    expect(Object.keys(dirty.bookmarks)).toEqual(["ok"]);
    // Built-in collections always exist after sanitization.
    expect(dirty.collections["col-must-revise"]).toBeDefined();
  });
});
