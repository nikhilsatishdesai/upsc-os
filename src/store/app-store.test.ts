import { beforeEach, describe, expect, it, vi } from "vitest";

// The store persists to localStorage, which doesn't exist in the Node test
// environment — provide an in-memory stand-in before the store module loads.
function createMemoryStorage(): Storage {
  let data: Record<string, string> = {};
  return {
    get length() {
      return Object.keys(data).length;
    },
    key: (index: number) => Object.keys(data)[index] ?? null,
    getItem: (key: string) => data[key] ?? null,
    setItem: (key: string, value: string) => {
      data[key] = value;
    },
    removeItem: (key: string) => {
      delete data[key];
    },
    clear: () => {
      data = {};
    },
  };
}

vi.stubGlobal("localStorage", createMemoryStorage());

const { useAppStore, exportStateToJSON, parseExportedState } = await import(
  "@/store/app-store"
);
const { todayStr, addDays } = await import("@/lib/planner/dates");
const { getTopicState } = await import("@/lib/stages");

const LEAF = "prelims.gs.polity.constitution.fundamental-rights";

const plannerSettings = {
  mainsDate: "2027-09-17",
  dailyHours: 6,
  wakeUpTime: "05:30",
  studyStartTime: "06:00",
  weeklyOffDay: -1,
  maxSessionsPerDay: 3,
  sessionMinutes: 60,
};

describe("study stages", () => {
  beforeEach(() => useAppStore.getState().resetAll());

  it("advances a stage and records study metadata", () => {
    useAppStore.getState().setStage(LEAF, "revision-2");
    const topic = getTopicState(useAppStore.getState().topics, LEAF);
    expect(topic.stage).toBe("revision-2");
    expect(topic.revisionCount).toBe(2);
    expect(topic.lastStudiedAt).toBe(todayStr());
  });

  it("resets study minutes when moved back to not-started", () => {
    useAppStore.getState().setStage(LEAF, "first-reading");
    useAppStore.getState().setStage(LEAF, "not-started");
    const topic = getTopicState(useAppStore.getState().topics, LEAF);
    expect(topic.stage).toBe("not-started");
    expect(topic.studiedMinutes).toBe(0);
  });

  it("stores topic metadata for the revision engine", () => {
    useAppStore
      .getState()
      .setTopicMeta(LEAF, { difficulty: "hard", confidence: 2 });
    const topic = getTopicState(useAppStore.getState().topics, LEAF);
    expect(topic.difficulty).toBe("hard");
    expect(topic.confidence).toBe(2);
    expect(topic.nextRevisionAt).toBeNull(); // reserved for V3
  });
});

describe("planner integration", () => {
  beforeEach(() => {
    useAppStore.getState().resetAll();
    useAppStore.getState().configurePlanner("2027-05-30", plannerSettings);
  });

  it("generates a plan on configuration", () => {
    const tasks = Object.values(useAppStore.getState().tasks);
    expect(tasks.length).toBeGreaterThan(0);
    expect(useAppStore.getState().examDate).toBe("2027-05-30");
    expect(useAppStore.getState().lastPlannedAt).toBe(todayStr());
  });

  it("completing every session of a topic finishes its first reading (syllabus sync)", () => {
    const state = useAppStore.getState();
    const task = Object.values(state.tasks).find(
      (t) => t.date === todayStr() && t.status === "pending",
    )!;
    // Complete tasks for this topic until its estimate is met.
    let topic = getTopicState(useAppStore.getState().topics, task.topicId);
    const before = topic.stage;
    expect(before).toBe("not-started");

    useAppStore.getState().completeTask(task.id);
    topic = getTopicState(useAppStore.getState().topics, task.topicId);
    expect(topic.studiedMinutes).toBe(task.minutes);

    // Simulate the remaining minutes via a user pin then completion.
    useAppStore.getState().regeneratePlan();
    const rest = Object.values(useAppStore.getState().tasks).filter(
      (t) => t.topicId === task.topicId && t.status === "pending",
    );
    for (const t of rest) useAppStore.getState().completeTask(t.id);
    topic = getTopicState(useAppStore.getState().topics, task.topicId);
    expect(topic.stage).toBe("first-reading");
    expect(topic.lastStudiedAt).toBe(todayStr());
  });

  it("reopening a completed task rolls the study minutes back", () => {
    const task = Object.values(useAppStore.getState().tasks).find(
      (t) => t.status === "pending",
    )!;
    useAppStore.getState().completeTask(task.id);
    useAppStore.getState().reopenTask(task.id);
    const topic = getTopicState(useAppStore.getState().topics, task.topicId);
    expect(topic.studiedMinutes).toBe(0);
    expect(useAppStore.getState().tasks[task.id].status).toBe("pending");
  });

  it("moving a task pins it and survives a replan", () => {
    const task = Object.values(useAppStore.getState().tasks).find(
      (t) => t.status === "pending",
    )!;
    const target = addDays(todayStr(), 3);
    useAppStore.getState().moveTask(task.id, target);
    useAppStore.getState().regeneratePlan();
    const moved = useAppStore.getState().tasks[task.id];
    expect(moved).toBeDefined();
    expect(moved.date).toBe(target);
    expect(moved.createdBy).toBe("user");
  });

  it("splitting halves a task; merging restores it", () => {
    const task = Object.values(useAppStore.getState().tasks).find(
      (t) => t.status === "pending" && t.minutes >= 30,
    )!;
    useAppStore.getState().splitTask(task.id);
    const half = useAppStore.getState().tasks[task.id];
    const sibling = useAppStore.getState().tasks[`${task.id}-b`];
    expect(half.minutes + sibling.minutes).toBe(task.minutes);

    useAppStore.getState().mergeTasks(task.id, sibling.id);
    expect(useAppStore.getState().tasks[task.id].minutes).toBe(task.minutes);
    expect(useAppStore.getState().tasks[sibling.id]).toBeUndefined();
  });

  it("finishing a first reading starts the 3-day revision clock", () => {
    const task = Object.values(useAppStore.getState().tasks).find(
      (t) => t.status === "pending" && t.kind === "study",
    )!;
    // Complete all study sessions for the topic.
    useAppStore.getState().completeTask(task.id);
    useAppStore.getState().regeneratePlan();
    for (const t of Object.values(useAppStore.getState().tasks)) {
      if (t.topicId === task.topicId && t.status === "pending") {
        useAppStore.getState().completeTask(t.id);
      }
    }
    const topic = getTopicState(useAppStore.getState().topics, task.topicId);
    expect(topic.stage).toBe("first-reading");
    expect(topic.nextRevisionAt).toBe(addDays(todayStr(), 3));
  });

  it("completing revisions climbs the ladder: R1 → +10d, R2 → +30d, R3 → done", () => {
    const topicId = "prelims.gs.economy.basics.inflation";
    useAppStore.getState().setStage(topicId, "first-reading");
    // Force the revision due today, then replan to materialise the task.
    useAppStore.setState((state) => ({
      topics: {
        ...state.topics,
        [topicId]: { ...state.topics[topicId], nextRevisionAt: todayStr() },
      },
    }));

    const expectations: {
      stage: string;
      next: string | null;
    }[] = [
      { stage: "revision-1", next: addDays(todayStr(), 10) },
      { stage: "revision-2", next: addDays(todayStr(), 30) },
      { stage: "revision-3", next: null },
    ];
    for (const expected of expectations) {
      useAppStore.getState().regeneratePlan();
      const revision = Object.values(useAppStore.getState().tasks).find(
        (t) =>
          t.topicId === topicId &&
          t.kind === "revision" &&
          t.status === "pending",
      );
      expect(revision, `revision task for ${expected.stage}`).toBeDefined();
      useAppStore.getState().completeTask(revision!.id);
      const topic = getTopicState(useAppStore.getState().topics, topicId);
      expect(topic.stage).toBe(expected.stage);
      expect(topic.nextRevisionAt).toBe(expected.next);
      // Pull the next revision forward so the ladder can be tested today.
      if (expected.next) {
        useAppStore.setState((state) => ({
          topics: {
            ...state.topics,
            [topicId]: {
              ...state.topics[topicId],
              nextRevisionAt: todayStr(),
            },
          },
        }));
      }
    }
    // After R3 no further revision task is generated.
    useAppStore.getState().regeneratePlan();
    const leftover = Object.values(useAppStore.getState().tasks).find(
      (t) =>
        t.topicId === topicId &&
        t.kind === "revision" &&
        t.status === "pending",
    );
    expect(leftover).toBeUndefined();
  });

  it("manual stage changes anchor the revision clock", () => {
    const topicId = "mains.essay.craft";
    useAppStore.getState().setStage(topicId, "notes-made");
    expect(
      getTopicState(useAppStore.getState().topics, topicId).nextRevisionAt,
    ).toBe(addDays(todayStr(), 3));
    useAppStore.getState().setStage(topicId, "exam-ready");
    expect(
      getTopicState(useAppStore.getState().topics, topicId).nextRevisionAt,
    ).toBeNull();
  });

  it("marks yesterday's unfinished work as missed on replan", () => {
    const task = Object.values(useAppStore.getState().tasks).find(
      (t) => t.status === "pending",
    )!;
    // Force the task into the past.
    useAppStore.setState((state) => ({
      tasks: {
        ...state.tasks,
        [task.id]: { ...task, date: addDays(todayStr(), -1) },
      },
    }));
    useAppStore.getState().regeneratePlan();
    expect(useAppStore.getState().tasks[task.id].status).toBe("missed");
    // Behaviour counters recorded the miss — its priority will rise.
    const topic = getTopicState(useAppStore.getState().topics, task.topicId);
    expect(topic.missedSessions).toBe(1);
    expect(topic.postponeCount).toBe(1);
  });

  it("records postponement signals for skips and later moves", () => {
    const [a, b] = Object.values(useAppStore.getState().tasks).filter(
      (t) => t.status === "pending",
    );
    useAppStore.getState().skipTask(a.id);
    expect(
      getTopicState(useAppStore.getState().topics, a.topicId).postponeCount,
    ).toBe(1);

    useAppStore.getState().moveTask(b.id, addDays(b.date, 4));
    expect(
      getTopicState(useAppStore.getState().topics, b.topicId).postponeCount,
    ).toBe(1);

    // Reopening the skip withdraws the signal.
    useAppStore.getState().reopenTask(a.id);
    expect(
      getTopicState(useAppStore.getState().topics, a.topicId).postponeCount,
    ).toBe(0);
  });

  it("writes a daily intelligence snapshot on replan", () => {
    const snapshots = useAppStore.getState().snapshots;
    const today = todayStr();
    expect(snapshots[today]).toBeDefined();
    expect(snapshots[today].remainingMinutes).toBeGreaterThan(0);
    expect(typeof snapshots[today].burnoutScore).toBe("number");
  });

  it("honours custom revision intervals from settings", () => {
    useAppStore.getState().configurePlanner("2027-05-30", {
      ...plannerSettings,
      revisionIntervals: [2, 7],
    } as never);
    const topicId = "prelims.csat.comprehension";
    useAppStore.getState().setStage(topicId, "first-reading");
    expect(
      getTopicState(useAppStore.getState().topics, topicId).nextRevisionAt,
    ).toBe(addDays(todayStr(), 2));
  });
});

describe("backup round-trip and migration", () => {
  beforeEach(() => useAppStore.getState().resetAll());

  it("round-trips V2 state through export and import", () => {
    useAppStore.getState().setStage(LEAF, "notes-made");
    useAppStore.getState().setDisplayName("Nikhil");
    useAppStore.getState().configurePlanner("2027-05-30", plannerSettings);

    const result = parseExportedState(exportStateToJSON());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    useAppStore.getState().resetAll();
    useAppStore.getState().importState(result.data);
    const restored = useAppStore.getState();
    expect(getTopicState(restored.topics, LEAF).stage).toBe("notes-made");
    expect(restored.planner?.mainsDate).toBe("2027-09-17");
    expect(Object.keys(restored.tasks).length).toBeGreaterThan(0);
  });

  it("round-trips the personal timetable and drops invalid entries", () => {
    useAppStore.getState().configurePlanner("2027-05-30", {
      ...plannerSettings,
      weekdayHours: [null, 3, 3, 3, 3, 0, 9],
      dayFocus: [null, ["mains.psir1", "not.a.paper"], null, null, null, null, ["mains.gs2.ir"]],
      afternoonStartTime: "15:00",
      eveningStartTime: "bad",
      paperWeights: { "mains.psir1": 3, "mains.psir2": 1, "mains.nope": 2 },
    } as typeof plannerSettings);

    const result = parseExportedState(exportStateToJSON());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const planner = result.data.planner!;
    expect(planner.weekdayHours).toEqual([null, 3, 3, 3, 3, 0, 9]);
    expect(planner.dayFocus[1]).toEqual(["mains.psir1"]);
    expect(planner.dayFocus[6]).toBeNull(); // a unit, not a paper
    expect(planner.afternoonStartTime).toBe("15:00");
    expect(planner.eveningStartTime).toBe("19:00");
    expect(planner.paperWeights).toEqual({ "mains.psir1": 3 });
  });

  it("imports a V1 backup by migrating statuses to stages", () => {
    const v1 = JSON.stringify({
      app: "upsc-os",
      version: 1,
      exportedAt: "2026-07-01T00:00:00.000Z",
      progress: {
        [LEAF]: "completed",
        "prelims.gs.polity.constitution.dpsp": "revised",
        "prelims.gs.polity.constitution.making": "in-progress",
        "no.such.topic": "completed",
      },
      displayName: "Nikhil",
      examDate: "2027-05-30",
      recentTopics: [LEAF],
    });
    const result = parseExportedState(v1);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.topics[LEAF].stage).toBe("first-reading");
    expect(
      result.data.topics["prelims.gs.polity.constitution.dpsp"].stage,
    ).toBe("revision-1");
    const partial = result.data.topics["prelims.gs.polity.constitution.making"];
    expect(partial.stage).toBe("not-started");
    expect(partial.studiedMinutes).toBeGreaterThan(0);
    expect(result.data.topics["no.such.topic"]).toBeUndefined();
  });

  it("rejects foreign and newer files", () => {
    expect(parseExportedState("{}").ok).toBe(false);
    expect(
      parseExportedState(JSON.stringify({ app: "upsc-os", version: 999 })).ok,
    ).toBe(false);
  });

  it("imports V2 backups: default 'medium' difficulty becomes auto, explicit choices stay", () => {
    const v2 = JSON.stringify({
      app: "upsc-os",
      version: 2,
      exportedAt: "2026-07-04T00:00:00.000Z",
      topics: {
        [LEAF]: {
          stage: "first-reading",
          studiedMinutes: 90,
          lastStudiedAt: "2026-07-03",
          revisionCount: 0,
          difficulty: "medium",
          confidence: 3,
          estimatedMinutes: null,
          nextRevisionAt: null,
        },
        "prelims.gs.economy.basics.inflation": {
          stage: "not-started",
          studiedMinutes: 0,
          lastStudiedAt: null,
          revisionCount: 0,
          difficulty: "hard",
          confidence: 2,
          estimatedMinutes: 120,
          nextRevisionAt: null,
        },
      },
      displayName: "Nikhil",
      examDate: "2027-05-30",
      recentTopics: [],
      planner: null,
      tasks: {},
      lastPlannedAt: null,
    });
    const result = parseExportedState(v2);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.topics[LEAF].difficulty).toBeNull();
    expect(result.data.topics[LEAF].priority).toBeNull();
    expect(
      result.data.topics["prelims.gs.economy.basics.inflation"].difficulty,
    ).toBe("hard");
  });
});
