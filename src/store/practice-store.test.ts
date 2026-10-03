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

const { usePracticeStore, sanitizePracticeExport, exportPractice } =
  await import("@/store/practice-store");
const { exportStateToJSON, parseExportedState } = await import(
  "@/store/app-store"
);
const {
  countWords,
  estimateMarks,
  practiceStats,
  rubricPercent,
  weakestCriteria,
  formatDuration,
} = await import("@/lib/practice/answers");

const TOPIC = "mains.psir1.concepts.justice";

const baseInput = {
  questionId: "psir-abc",
  question: "Critically examine Rawls' theory of justice.",
  topicId: TOPIC,
  marks: 15 as const,
  answer: "Rawls argues for justice as fairness behind a veil of ignorance.",
  secondsSpent: 500,
  timeLimitSeconds: 660,
};

describe("answer maths", () => {
  it("counts words, ignoring bullet dashes and heading marks", () => {
    expect(countWords("")).toBe(0);
    expect(countWords("  one two\nthree  ")).toBe(3);
    expect(countWords("- point one\n## Heading\nself-help")).toBe(4);
  });

  it("scores the rubric and maps it onto a realistic marks band", () => {
    expect(rubricPercent({})).toBeNull();
    expect(rubricPercent({ demand: 2, intro: 2, theory: 2, perspectives: 2, evidence: 2, structure: 2, conclusion: 2 })).toBe(100);
    expect(rubricPercent({ demand: 1 })).toBe(7);
    expect(estimateMarks(10, {})).toBeNull();
    // Perfect rubric → 65% of marks; empty-but-scored → 20%.
    expect(estimateMarks(20, { demand: 2, intro: 2, theory: 2, perspectives: 2, evidence: 2, structure: 2, conclusion: 2 })).toBe(13);
    expect(estimateMarks(10, { demand: 0 })).toBe(2);
  });

  it("lists the weakest criteria worst-first", () => {
    expect(weakestCriteria({ demand: 2, intro: 1, theory: 0 })).toEqual(["theory", "intro"]);
  });

  it("formats durations as m:ss", () => {
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(65)).toBe("1:05");
    expect(formatDuration(660)).toBe("11:00");
  });
});

describe("practice store", () => {
  beforeEach(() => usePracticeStore.getState().resetPractice());

  it("saves an attempt with derived word count and validated topic", () => {
    const id = usePracticeStore.getState().saveAnswer(baseInput);
    const saved = usePracticeStore.getState().answers[id];
    expect(saved.wordCount).toBe(11);
    expect(saved.topicId).toBe(TOPIC);
    expect(saved.aiFeedback).toBeNull();

    const unlinked = usePracticeStore
      .getState()
      .saveAnswer({ ...baseInput, topicId: "not.a.topic" });
    expect(usePracticeStore.getState().answers[unlinked].topicId).toBeNull();
  });

  it("updates rubric, text and AI feedback, then deletes", () => {
    const store = usePracticeStore.getState();
    const id = store.saveAnswer(baseInput);
    store.setAnswerRubric(id, { demand: 2, theory: 1 });
    store.updateAnswerText(id, "Shorter answer now");
    store.setAnswerAiFeedback(id, "Add Sandel's critique.");
    const updated = usePracticeStore.getState().answers[id];
    expect(updated.rubric).toEqual({ demand: 2, theory: 1 });
    expect(updated.wordCount).toBe(3);
    expect(updated.aiFeedback).toBe("Add Sandel's critique.");
    usePracticeStore.getState().deleteAnswer(id);
    expect(usePracticeStore.getState().answers[id]).toBeUndefined();
  });

  it("tracks booklist and thinker progress, clearing with null", () => {
    const store = usePracticeStore.getState();
    store.setSourceStatus("gauba-political-theory", "reading");
    store.setThinkerStatus("rawls", "mastered");
    expect(usePracticeStore.getState().sources).toEqual({ "gauba-political-theory": "reading" });
    store.setSourceStatus("gauba-political-theory", null);
    expect(usePracticeStore.getState().sources).toEqual({});
    expect(usePracticeStore.getState().thinkers.rawls).toBe("mastered");
  });

  it("keeps the in-progress draft until cleared", () => {
    usePracticeStore.getState().setDraft({
      questionId: null,
      question: "Custom",
      topicId: null,
      marks: 10,
      answer: "half written",
      secondsSpent: 30,
      startedAt: new Date().toISOString(),
    });
    expect(usePracticeStore.getState().draft?.answer).toBe("half written");
    usePracticeStore.getState().setDraft(null);
    expect(usePracticeStore.getState().draft).toBeNull();
  });
});

describe("practice statistics", () => {
  it("computes weekly count, streak, averages and the focus criterion", () => {
    const today = "2026-10-03";
    const at = (day: string) => new Date(`${day}T10:00:00`).toISOString();
    const make = (day: string, extra: Partial<import("@/lib/practice/types").AnswerAttempt>) => ({
      id: day,
      questionId: null,
      question: "Q",
      topicId: TOPIC,
      marks: 10 as const,
      answer: "a",
      wordCount: 1,
      secondsSpent: 300,
      timeLimitSeconds: 420,
      rubric: {},
      aiFeedback: null,
      createdAt: at(day),
      updatedAt: at(day),
      ...extra,
    });
    const stats = practiceStats(
      [
        make("2026-10-03", { rubric: { demand: 2, evidence: 0 } }),
        make("2026-10-02", { rubric: { demand: 2, evidence: 1 }, secondsSpent: 600 }),
        make("2026-10-01", { topicId: "mains.psir2.power-centres.china" }),
        make("2026-09-20", { topicId: null }),
      ],
      today,
    );
    expect(stats.total).toBe(4);
    expect(stats.thisWeek).toBe(3);
    expect(stats.streak).toBe(3);
    expect(stats.onTimePercent).toBe(75);
    expect(stats.focusCriterion).toBe("evidence");
    expect(stats.byPaper).toEqual({ psir1: 2, psir2: 1, other: 1 });
    expect(stats.averagePercent).not.toBeNull();
  });

  it("streak counts from yesterday when nothing is written today yet", () => {
    const at = new Date("2026-10-02T09:00:00").toISOString();
    const stats = practiceStats(
      [{ id: "x", questionId: null, question: "Q", topicId: null, marks: 10, answer: "", wordCount: 0, secondsSpent: 0, timeLimitSeconds: 420, rubric: {}, aiFeedback: null, createdAt: at, updatedAt: at }],
      "2026-10-03",
    );
    expect(stats.streak).toBe(1);
    expect(stats.onTimePercent).toBeNull();
  });
});

describe("practice backup section (format v7)", () => {
  beforeEach(() => usePracticeStore.getState().resetPractice());

  it("round-trips answers and progress through the backup file", () => {
    const id = usePracticeStore.getState().saveAnswer({
      ...baseInput,
      rubric: { demand: 2 },
    });
    usePracticeStore.getState().setSourceStatus("laxmikanth", "done");

    const parsed = parseExportedState(exportStateToJSON());
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.data.practice?.answers[id].rubric).toEqual({ demand: 2 });
    expect(parsed.data.practice?.sources).toEqual({ laxmikanth: "done" });

    usePracticeStore.getState().resetPractice();
    usePracticeStore.getState().importPractice(parsed.data.practice!);
    expect(exportPractice().answers[id].question).toBe(baseInput.question);
  });

  it("imports pre-v7 backups with no practice section", () => {
    const v6 = JSON.stringify({
      app: "upsc-os",
      version: 6,
      exportedAt: new Date().toISOString(),
      topics: {},
      displayName: "",
      examDate: "",
      recentTopics: [],
      planner: null,
      tasks: {},
      lastPlannedAt: null,
      snapshots: {},
      focusCollectionId: null,
      knowledge: null,
      ai: null,
    });
    const parsed = parseExportedState(v6);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.data.practice).toBeNull();
  });

  it("drops malformed entries instead of throwing", () => {
    const clean = sanitizePracticeExport({
      answers: {
        good: { question: "Q?", answer: "x y", marks: 20, rubric: { demand: 2, bogus: 9, theory: 5 }, topicId: "nope" },
        noQuestion: { question: "  ", answer: "x" },
        junk: 42,
      },
      sources: { a: "done", b: "finished" },
      thinkers: { rawls: "mastered", x: true },
    });
    expect(Object.keys(clean.answers)).toEqual(["good"]);
    expect(clean.answers.good.rubric).toEqual({ demand: 2 });
    expect(clean.answers.good.topicId).toBeNull();
    expect(clean.answers.good.wordCount).toBe(2);
    expect(clean.sources).toEqual({ a: "done" });
    expect(clean.thinkers).toEqual({ rawls: "mastered" });
    expect(sanitizePracticeExport(null)).toEqual({ answers: {}, sources: {}, thinkers: {} });
  });
});
