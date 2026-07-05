import { describe, expect, it } from "vitest";

import { effectiveConfidence } from "@/lib/planner/confidence";
import { priorityScore } from "@/lib/planner/priority";
import { generateSchedule } from "@/lib/planner/scheduler";
import { dayCapacity, isVacationDay } from "@/lib/planner/capacity";
import { addDays } from "@/lib/planner/dates";
import { curatedTopicIntel } from "@/lib/planner/intel";
import { PLANNER_SETTING_DEFAULTS, withPlannerDefaults } from "@/lib/planner/config";
import type { PlannerSettings } from "@/lib/planner/types";
import { DEFAULT_TOPIC_STATE, type TopicState } from "@/lib/stages";

const TODAY = "2026-07-06";
const EXAM = "2027-05-30";

const settings: PlannerSettings = withPlannerDefaults({
  mainsDate: "2027-09-17",
  dailyHours: 6,
  wakeUpTime: "05:30",
  studyStartTime: "06:00",
  weeklyOffDay: 0,
  maxSessionsPerDay: 3,
  sessionMinutes: 60,
});

const EASY_TOPIC = "prelims.csat.reasoning"; // curated easy
const HARD_TOPIC = "prelims.gs.polity.constitution.fundamental-rights"; // hard

function topic(patch: Partial<TopicState>): TopicState {
  return { ...DEFAULT_TOPIC_STATE, ...patch };
}

describe("confidence decay model", () => {
  it("rises with completed revisions", () => {
    const before = effectiveConfidence(EASY_TOPIC, topic({}), TODAY).value;
    const after = effectiveConfidence(
      EASY_TOPIC,
      topic({ revisionCount: 2, lastStudiedAt: TODAY }),
      TODAY,
    ).value;
    expect(after).toBeGreaterThan(before);
  });

  it("decays after long idle periods", () => {
    const fresh = effectiveConfidence(
      EASY_TOPIC,
      topic({ lastStudiedAt: TODAY }),
      TODAY,
    ).value;
    const stale = effectiveConfidence(
      EASY_TOPIC,
      topic({ lastStudiedAt: addDays(TODAY, -60) }),
      TODAY,
    ).value;
    expect(stale).toBeLessThan(fresh);
  });

  it("drops with repeated postponement and hard material", () => {
    const avoided = effectiveConfidence(
      HARD_TOPIC,
      topic({ postponeCount: 4 }),
      TODAY,
    );
    const untouched = effectiveConfidence(EASY_TOPIC, topic({}), TODAY);
    expect(avoided.value).toBeLessThan(untouched.value);
    expect(avoided.reasons.join(" ")).toContain("postponed");
  });

  it("stays clamped to the 1–5 scale", () => {
    const floor = effectiveConfidence(
      HARD_TOPIC,
      topic({ confidence: 1, postponeCount: 10, lastStudiedAt: addDays(TODAY, -365) }),
      TODAY,
    );
    expect(floor.value).toBeGreaterThanOrEqual(1);
    const ceiling = effectiveConfidence(
      EASY_TOPIC,
      topic({ confidence: 5, revisionCount: 3, lastStudiedAt: TODAY }),
      TODAY,
    );
    expect(ceiling.value).toBeLessThanOrEqual(5);
  });
});

describe("dynamic priority engine", () => {
  const ctx = { today: TODAY, examDate: EXAM };

  it("rises when the user keeps avoiding a topic", () => {
    const calm = priorityScore(EASY_TOPIC, topic({}), ctx).total;
    const avoided = priorityScore(
      EASY_TOPIC,
      topic({ postponeCount: 4, missedSessions: 3 }),
      ctx,
    ).total;
    expect(avoided).toBeGreaterThan(calm);
  });

  it("rises sharply when a revision goes overdue", () => {
    const onTime = priorityScore(
      EASY_TOPIC,
      topic({ stage: "first-reading", nextRevisionAt: addDays(TODAY, 2) }),
      ctx,
    ).total;
    const overdue = priorityScore(
      EASY_TOPIC,
      topic({ stage: "first-reading", nextRevisionAt: addDays(TODAY, -5) }),
      ctx,
    );
    expect(overdue.total).toBeGreaterThan(onTime);
    expect(overdue.reasons.join(" ")).toContain("overdue");
  });

  it("falls after successful completion and revision", () => {
    const untouched = priorityScore(EASY_TOPIC, topic({}), ctx).total;
    const wellRevised = priorityScore(
      EASY_TOPIC,
      topic({
        stage: "revision-2",
        revisionCount: 2,
        lastStudiedAt: TODAY,
        nextRevisionAt: addDays(TODAY, 20),
      }),
      ctx,
    ).total;
    expect(wellRevised).toBeLessThan(untouched);
  });

  it("amplifies important topics as the exam approaches", () => {
    const far = priorityScore(HARD_TOPIC, topic({}), {
      today: TODAY,
      examDate: addDays(TODAY, 300),
    }).total;
    const near = priorityScore(HARD_TOPIC, topic({}), {
      today: TODAY,
      examDate: addDays(TODAY, 30),
    }).total;
    expect(near).toBeGreaterThan(far);
  });

  it("every score comes with human-readable reasons", () => {
    const score = priorityScore(HARD_TOPIC, topic({ postponeCount: 2 }), ctx);
    expect(score.reasons.length).toBeGreaterThanOrEqual(2);
    for (const reason of score.reasons) {
      expect(reason).toMatch(/\(\+\d+\)/);
    }
  });
});

describe("scheduler v3 constraints", () => {
  function makeCounterId() {
    let n = 0;
    return () => `task-${++n}`;
  }
  const schedule = (overrides: Partial<PlannerSettings> = {}) =>
    generateSchedule({
      settings: { ...settings, ...overrides },
      topics: {},
      examDate: EXAM,
      pinnedTasks: [],
      fromDate: TODAY,
      makeId: makeCounterId(),
    });

  it("never exceeds the max hard sessions per day", () => {
    const tasks = schedule({ maxHardPerDay: 1 });
    const hardByDate = new Map<string, number>();
    for (const task of tasks) {
      if (curatedTopicIntel(task.topicId).difficulty === "hard") {
        hardByDate.set(task.date, (hardByDate.get(task.date) ?? 0) + 1);
      }
    }
    for (const [, count] of hardByDate) {
      expect(count).toBeLessThanOrEqual(1);
    }
  });

  it("easy-first mornings do not open with hard material", () => {
    const tasks = schedule({ morningDifficulty: "easy-first" });
    const firstByDate = new Map<string, string>();
    for (const task of tasks) {
      if (!firstByDate.has(task.date)) firstByDate.set(task.date, task.topicId);
    }
    for (const [, topicId] of firstByDate) {
      expect(curatedTopicIntel(topicId).difficulty).not.toBe("hard");
    }
  });

  it("schedules nothing inside a vacation", () => {
    const from = addDays(TODAY, 3);
    const to = addDays(TODAY, 5);
    const tasks = schedule({ vacationFrom: from, vacationTo: to });
    for (const task of tasks) {
      expect(isVacationDay(task.date, { ...settings, vacationFrom: from, vacationTo: to })).toBe(false);
    }
  });

  it("light weekends carry a reduced load", () => {
    const light = { ...settings, weekendStrategy: "light" as const };
    // 2026-07-11 is a Saturday.
    expect(dayCapacity("2026-07-11", light).capacityMinutes).toBeLessThan(
      dayCapacity("2026-07-10", light).capacityMinutes,
    );
  });

  it("relaxed aggressiveness plans less than intense", () => {
    const relaxed = dayCapacity(TODAY, { ...settings, aggressiveness: "relaxed" });
    const intense = dayCapacity(TODAY, { ...settings, aggressiveness: "intense" });
    expect(relaxed.capacityMinutes).toBeLessThan(intense.capacityMinutes);
  });

  it("defaults keep old stored settings working (backward compatibility)", () => {
    const old = {
      mainsDate: "2027-09-17",
      dailyHours: 6,
      wakeUpTime: "05:30",
      studyStartTime: "06:00",
      weeklyOffDay: 0,
      maxSessionsPerDay: 3,
      sessionMinutes: 60,
    };
    const merged = withPlannerDefaults(old);
    expect(merged.revisionIntervals).toEqual(
      PLANNER_SETTING_DEFAULTS.revisionIntervals,
    );
    expect(merged.burnoutSensitivity).toBe("medium");
    // And the scheduler accepts the old shape directly.
    const tasks = generateSchedule({
      settings: old as PlannerSettings,
      topics: {},
      pinnedTasks: [],
      fromDate: TODAY,
      makeId: makeCounterId(),
    });
    expect(tasks.length).toBeGreaterThan(0);
  });
});
