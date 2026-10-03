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

const { usePrefsStore, sanitizePrefsExport } = await import("@/store/prefs-store");
const { exportStateToJSON, parseExportedState } = await import("@/store/app-store");
const { currentWeek, paperDeadlineStatus, weeklyTargetProgress } = await import(
  "@/lib/targets"
);
const { DEFAULT_TOPIC_STATE } = await import("@/lib/stages");
const { getLeafIds } = await import("@/lib/syllabus");

describe("prefs store", () => {
  beforeEach(() => usePrefsStore.getState().resetPrefs());

  it("sets profile, targets, deadlines and dashboard layout", () => {
    const store = usePrefsStore.getState();
    store.setAttemptYear(2027);
    store.setOptionalSubject("other");
    store.setTargets({ studyHours: 40, answers: 10 });
    store.setPaperDeadline("mains.psir1", "2026-12-31");
    store.setCardHidden("knowledge", true);
    store.setCardHidden("knowledge", true);
    const state = usePrefsStore.getState();
    expect(state.attemptYear).toBe(2027);
    expect(state.optionalSubject).toBe("other");
    expect(state.targets.studyHours).toBe(40);
    expect(state.targets.sessions).toBeNull();
    expect(state.targets.paperDeadlines).toEqual({ "mains.psir1": "2026-12-31" });
    expect(state.hiddenCards).toEqual(["knowledge"]);

    store.setPaperDeadline("mains.psir1", null);
    store.setCardHidden("knowledge", false);
    expect(usePrefsStore.getState().targets.paperDeadlines).toEqual({});
    expect(usePrefsStore.getState().hiddenCards).toEqual([]);
  });

  it("round-trips through the v7 backup and sanitizes bad input", () => {
    usePrefsStore.getState().setTargets({ answers: 12 });
    const parsed = parseExportedState(exportStateToJSON());
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.data.prefs?.targets.answers).toBe(12);

    const clean = sanitizePrefsExport({
      attemptYear: 1999,
      optionalSubject: "maths",
      targets: { studyHours: -3, answers: 500, paperDeadlines: { "mains.psir2": "2027-01-15", "mains.gs2.ir": "2027-01-01", "mains.gs1": "nope" } },
      hiddenCards: ["papers", "bogus"],
    });
    expect(clean.attemptYear).toBeNull();
    expect(clean.optionalSubject).toBe("psir");
    expect(clean.targets.studyHours).toBeNull();
    expect(clean.targets.answers).toBe(50);
    expect(clean.targets.paperDeadlines).toEqual({ "mains.psir2": "2027-01-15" });
    expect(clean.hiddenCards).toEqual(["papers"]);
  });
});

describe("target maths", () => {
  it("uses a Monday-to-Sunday week", () => {
    expect(currentWeek("2026-10-03")).toEqual({ start: "2026-09-28", end: "2026-10-04" }); // Saturday
    expect(currentWeek("2026-09-28")).toEqual({ start: "2026-09-28", end: "2026-10-04" }); // Monday
    expect(currentWeek("2026-10-04").start).toBe("2026-09-28"); // Sunday
  });

  it("measures weekly progress only for targets that are set", () => {
    const at = (day: string) => new Date(`${day}T09:00:00`).toISOString();
    const task = (id: string, day: string, minutes: number, status = "completed") => ({
      id, topicId: "mains.psir1.concepts.justice", date: day, slot: "morning" as const,
      minutes, kind: "study" as const, status: status as "completed", completedAt: at(day), createdBy: "auto" as const,
    });
    const progress = weeklyTargetProgress({
      targets: { studyHours: 4, sessions: null, answers: 2, flashcardReviews: 0 },
      tasks: [task("a", "2026-09-29", 90), task("b", "2026-10-01", 90), task("c", "2026-09-20", 600)],
      answers: [{ createdAt: at("2026-10-02") }, { createdAt: at("2026-10-03") }] as never,
      events: [],
      today: "2026-10-03",
    });
    expect(progress.map((item) => item.key)).toEqual(["studyHours", "answers"]);
    expect(progress[0]).toMatchObject({ current: 3, target: 4, percent: 75, met: false });
    expect(progress[1]).toMatchObject({ current: 2, met: true, percent: 100 });
  });

  it("tracks a paper's first-reading deadline", () => {
    const leaves = getLeafIds("mains.psir2");
    const topics = Object.fromEntries(
      leaves.slice(0, 20).map((id) => [
        id,
        { ...DEFAULT_TOPIC_STATE, stage: "first-reading" as const, lastStudiedAt: "2026-09-25" },
      ]),
    );
    const status = paperDeadlineStatus(topics, "mains.psir2", "2026-12-31", "2026-10-03");
    expect(status.done).toBe(20);
    expect(status.remaining).toBe(leaves.length - 20);
    expect(status.recentPerWeek).toBe(5);
    expect(status.requiredPerWeek).toBeGreaterThan(0);
    expect(status.status).toBe("on-track");

    expect(paperDeadlineStatus({}, "mains.psir2", "2026-09-01", "2026-10-03").status).toBe("overdue");
    expect(paperDeadlineStatus({}, "mains.psir2", "2026-10-20", "2026-10-03").status).toBe("behind");
  });
});
