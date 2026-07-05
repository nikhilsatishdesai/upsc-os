import { describe, expect, it, vi } from "vitest";

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

const { buildWorkPool, buildRevisionQueue } = await import(
  "@/lib/planner/workload"
);
const { computeForecast } = await import("@/lib/planner/forecast");
const { withPlannerDefaults } = await import("@/lib/planner/config");
const { addDays, todayStr } = await import("@/lib/planner/dates");
const { DEFAULT_TOPIC_STATE } = await import("@/lib/stages");
const { getLeafIds } = await import("@/lib/syllabus");
const { useAppStore } = await import("@/store/app-store");
const { useKnowledgeStore } = await import("@/store/knowledge-store");

type TopicStateMap = import("@/lib/stages").TopicStateMap;

const TODAY = "2026-07-06";
const FR = "prelims.gs.polity.constitution.fundamental-rights";
const INFLATION = "prelims.gs.economy.basics.inflation";

const settings = withPlannerDefaults({
  mainsDate: "2027-09-17",
  dailyHours: 6,
  wakeUpTime: "05:30",
  studyStartTime: "06:00",
  weeklyOffDay: -1,
  maxSessionsPerDay: 3,
  sessionMinutes: 60,
});

describe("study scope in the engines", () => {
  it("paused and excluded topics leave the study pool", () => {
    const topics: TopicStateMap = {
      [FR]: { ...DEFAULT_TOPIC_STATE, planState: "excluded" },
      [INFLATION]: { ...DEFAULT_TOPIC_STATE, planState: "paused" },
    };
    const ids = buildWorkPool(topics).map((item) => item.topicId);
    expect(ids).not.toContain(FR);
    expect(ids).not.toContain(INFLATION);
    // Everything else stays schedulable.
    expect(ids.length).toBeGreaterThan(200);
  });

  it("a focus set restricts the pool to its topics", () => {
    const ids = buildWorkPool({}, new Map(), { today: TODAY, examDate: "" }, new Set([FR, INFLATION]))
      .map((item) => item.topicId)
      .sort();
    expect(ids).toEqual([INFLATION, FR].sort());
  });

  it("revisions defer while a topic is paused and resume on include", () => {
    const paused: TopicStateMap = {
      [FR]: {
        ...DEFAULT_TOPIC_STATE,
        stage: "first-reading",
        planState: "paused",
        nextRevisionAt: TODAY,
      },
    };
    expect(buildRevisionQueue(paused, TODAY)).toHaveLength(0);

    const resumed: TopicStateMap = {
      [FR]: { ...paused[FR], planState: "included" },
    };
    expect(buildRevisionQueue(resumed, TODAY)).toHaveLength(1);
  });

  it("excluded topics leave the forecast; paused topics stay in it", () => {
    const full = computeForecast({}, settings, addDays(TODAY, 300), TODAY);

    const excludedTopics: TopicStateMap = {};
    for (const id of getLeafIds("mains.languages")) {
      excludedTopics[id] = { ...DEFAULT_TOPIC_STATE, planState: "excluded" };
    }
    const excluded = computeForecast(
      excludedTopics,
      settings,
      addDays(TODAY, 300),
      TODAY,
    );
    expect(excluded.totalRemainingMinutes).toBeLessThan(
      full.totalRemainingMinutes,
    );

    const pausedTopics: TopicStateMap = {};
    for (const id of getLeafIds("mains.languages")) {
      pausedTopics[id] = { ...DEFAULT_TOPIC_STATE, planState: "paused" };
    }
    const paused = computeForecast(
      pausedTopics,
      settings,
      addDays(TODAY, 300),
      TODAY,
    );
    expect(paused.totalRemainingMinutes).toBe(full.totalRemainingMinutes);
  });

  it("excluding preserves recorded progress", () => {
    useAppStore.getState().resetAll();
    useAppStore.getState().setStage(FR, "revision-2");
    useAppStore.getState().setPlanState(FR, "excluded");
    const topic = useAppStore.getState().topics[FR];
    expect(topic.planState).toBe("excluded");
    expect(topic.stage).toBe("revision-2");
    expect(topic.revisionCount).toBe(2);
  });
});

describe("study scope in the store", () => {
  const plannerSettings = {
    mainsDate: "2027-09-17",
    dailyHours: 6,
    wakeUpTime: "05:30",
    studyStartTime: "06:00",
    weeklyOffDay: -1,
    maxSessionsPerDay: 3,
    sessionMinutes: 60,
  };

  it("bulk-excluding a subject removes its scheduled tasks on replan", () => {
    useAppStore.getState().resetAll();
    useAppStore.getState().configurePlanner("2027-05-30", plannerSettings as never);
    const before = Object.values(useAppStore.getState().tasks).filter(
      (task) =>
        task.status === "pending" && task.topicId.startsWith("prelims.csat."),
    );
    expect(before.length).toBeGreaterThan(0);

    useAppStore.getState().setPlanStateForSubtree("prelims.csat", "excluded");
    const after = Object.values(useAppStore.getState().tasks).filter(
      (task) =>
        task.status === "pending" && task.topicId.startsWith("prelims.csat."),
    );
    expect(after).toHaveLength(0);

    // Resume restores scheduling.
    useAppStore.getState().setPlanStateForSubtree("prelims.csat", "included");
    const resumed = Object.values(useAppStore.getState().tasks).filter(
      (task) =>
        task.status === "pending" && task.topicId.startsWith("prelims.csat."),
    );
    expect(resumed.length).toBeGreaterThan(0);
  });

  it("focusing on a collection restricts fresh study but not revisions", () => {
    useAppStore.getState().resetAll();
    useKnowledgeStore.getState().resetKnowledge();
    useAppStore.getState().configurePlanner("2027-05-30", plannerSettings as never);

    // A collection holding just two topics.
    useKnowledgeStore.getState().addBookmark("topic", FR, FR, "col-must-revise");
    useKnowledgeStore
      .getState()
      .addBookmark("topic", INFLATION, INFLATION, "col-must-revise");

    // A revision due on a topic OUTSIDE the collection.
    useAppStore.getState().setStage("mains.essay.craft", "first-reading");
    useAppStore.setState((state) => ({
      topics: {
        ...state.topics,
        "mains.essay.craft": {
          ...state.topics["mains.essay.craft"],
          nextRevisionAt: todayStr(),
        },
      },
    }));

    useAppStore.getState().setFocusCollection("col-must-revise");
    const pending = Object.values(useAppStore.getState().tasks).filter(
      (task) => task.status === "pending" && task.createdBy === "auto",
    );
    const studyTopics = new Set(
      pending.filter((task) => task.kind === "study").map((task) => task.topicId),
    );
    expect([...studyTopics].every((id) => id === FR || id === INFLATION)).toBe(
      true,
    );
    expect(
      pending.some(
        (task) => task.kind === "revision" && task.topicId === "mains.essay.craft",
      ),
    ).toBe(true);

    // Clearing the focus restores the full pool.
    useAppStore.getState().setFocusCollection(null);
    const widened = new Set(
      Object.values(useAppStore.getState().tasks)
        .filter((task) => task.status === "pending" && task.kind === "study")
        .map((task) => task.topicId),
    );
    expect(widened.size).toBeGreaterThan(2);
  });

  it("manual planning pins sessions that survive replans", () => {
    useAppStore.getState().resetAll();
    useAppStore.getState().configurePlanner("2027-05-30", plannerSettings as never);

    useAppStore.getState().planTopicNow("mains.gs4.probity.corruption", "tomorrow");
    const pinned = Object.values(useAppStore.getState().tasks).find(
      (task) =>
        task.topicId === "mains.gs4.probity.corruption" &&
        task.createdBy === "user",
    );
    expect(pinned).toBeDefined();
    expect(pinned!.date).toBe(addDays(todayStr(), 1));

    useAppStore.getState().regeneratePlan();
    expect(useAppStore.getState().tasks[pinned!.id]).toBeDefined();
  });

  it("'this week' picks a day with free capacity", () => {
    useAppStore.getState().resetAll();
    useAppStore.getState().configurePlanner("2027-05-30", plannerSettings as never);
    useAppStore.getState().planTopicNow(FR, "this-week");
    const pinned = Object.values(useAppStore.getState().tasks).find(
      (task) => task.topicId === FR && task.createdBy === "user",
    );
    expect(pinned).toBeDefined();
    const today = todayStr();
    expect(pinned!.date >= today).toBe(true);
    expect(pinned!.date <= addDays(today, 6)).toBe(true);
  });
});
