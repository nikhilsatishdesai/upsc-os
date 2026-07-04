import { describe, expect, it } from "vitest";

import { generateSchedule, isRecoveryDay } from "@/lib/planner/scheduler";
import { dayCapacity } from "@/lib/planner/capacity";
import { addDays, weekdayOf } from "@/lib/planner/dates";
import { curatedTopicIntel } from "@/lib/planner/intel";
import { PLANNER_CONFIG } from "@/lib/planner/config";
import type { PlannedTask, PlannerSettings } from "@/lib/planner/types";
import { DEFAULT_TOPIC_STATE, type TopicStateMap } from "@/lib/stages";
import { getLeafIds } from "@/lib/syllabus";

const settings: PlannerSettings = {
  mainsDate: "2027-09-17",
  dailyHours: 6,
  wakeUpTime: "05:30",
  studyStartTime: "06:00",
  weeklyOffDay: 0, // Sunday
  maxSessionsPerDay: 3,
  sessionMinutes: 60,
};

const FROM = "2026-07-06"; // a Monday

function makeCounterId() {
  let n = 0;
  return () => `task-${++n}`;
}

function schedule(
  topics: TopicStateMap = {},
  pinned: PlannedTask[] = [],
  overrides: Partial<PlannerSettings> = {},
) {
  return generateSchedule({
    settings: { ...settings, ...overrides },
    topics,
    pinnedTasks: pinned,
    fromDate: FROM,
    makeId: makeCounterId(),
  });
}

function minutesByDate(tasks: PlannedTask[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const t of tasks) map.set(t.date, (map.get(t.date) ?? 0) + t.minutes);
  return map;
}

describe("scheduling engine", () => {
  it("never exceeds a day's capacity", () => {
    const tasks = schedule();
    const capacity = dayCapacity(FROM, settings).capacityMinutes;
    for (const [, minutes] of minutesByDate(tasks)) {
      expect(minutes).toBeLessThanOrEqual(capacity);
    }
  });

  it("schedules nothing on the weekly off day", () => {
    const tasks = schedule();
    for (const task of tasks) {
      expect(weekdayOf(task.date)).not.toBe(settings.weeklyOffDay);
    }
  });

  it("fills the whole rolling horizon when work remains", () => {
    const tasks = schedule();
    const dates = new Set(tasks.map((t) => t.date));
    // 14-day horizon minus 2 Sundays
    expect(dates.size).toBe(12);
  });

  it("mixes subjects: consecutive sessions never repeat a unit", () => {
    const tasks = schedule();
    const byDate = new Map<string, PlannedTask[]>();
    for (const t of tasks) {
      byDate.set(t.date, [...(byDate.get(t.date) ?? []), t]);
    }
    for (const [, dayTasks] of byDate) {
      for (let i = 1; i < dayTasks.length; i++) {
        const unit = (id: string) => id.split(".").slice(0, 3).join(".");
        expect(unit(dayTasks[i].topicId)).not.toBe(
          unit(dayTasks[i - 1].topicId),
        );
      }
    }
  });

  it("balances prelims and mains work", () => {
    // Strict alternation may be broken by difficulty spacing, but the mix
    // must stay balanced: neither stage may dominate a 6-session window.
    const tasks = schedule();
    const window = tasks.slice(0, 6).map((t) => t.topicId.split(".")[0]);
    const prelimsCount = window.filter((s) => s === "prelims").length;
    expect(prelimsCount).toBeGreaterThanOrEqual(2);
    expect(prelimsCount).toBeLessThanOrEqual(4);
  });

  it("skips topics that are already studied", () => {
    const topics: TopicStateMap = {};
    for (const id of getLeafIds("prelims")) {
      topics[id] = { ...DEFAULT_TOPIC_STATE, stage: "first-reading" };
    }
    const tasks = schedule(topics);
    expect(tasks.every((t) => t.topicId.startsWith("mains."))).toBe(true);
  });

  it("respects pinned tasks: no double-booking, capacity preserved", () => {
    const pinnedTopic = "prelims.gs.history.ancient.ivc";
    const pinned: PlannedTask[] = [
      {
        id: "pin-1",
        topicId: pinnedTopic,
        date: FROM,
        slot: "morning",
        minutes: 120, // covers the whole default topic + more
        kind: "study",
        status: "pending",
        completedAt: null,
        createdBy: "user",
      },
    ];
    const tasks = schedule({}, pinned);
    expect(tasks.some((t) => t.topicId === pinnedTopic)).toBe(false);
    const firstDay = tasks.filter((t) => t.date === FROM);
    const total = firstDay.reduce((sum, t) => sum + t.minutes, 120);
    expect(total).toBeLessThanOrEqual(
      dayCapacity(FROM, settings).capacityMinutes,
    );
  });

  it("redistributes after missed days without overloading (adaptive replan)", () => {
    // Simulate replanning 3 days later: same pool, later start.
    const later = addDays(FROM, 3);
    const tasks = generateSchedule({
      settings,
      topics: {},
      pinnedTasks: [],
      fromDate: later,
      makeId: makeCounterId(),
    });
    const capacity = dayCapacity(later, settings).capacityMinutes;
    for (const [, minutes] of minutesByDate(tasks)) {
      expect(minutes).toBeLessThanOrEqual(capacity);
    }
  });

  it("produces no zero- or negative-minute tasks", () => {
    for (const task of schedule()) {
      expect(task.minutes).toBeGreaterThan(0);
    }
  });

  it("honours a tiny schedule (1 session of 30 minutes)", () => {
    const tasks = schedule({}, [], {
      dailyHours: 0.5,
      maxSessionsPerDay: 1,
      sessionMinutes: 30,
    });
    for (const [, minutes] of minutesByDate(tasks)) {
      expect(minutes).toBeLessThanOrEqual(30);
    }
  });
});

describe("priority engine", () => {
  it("schedules critical topics before lower-priority ones in the same unit", () => {
    const tasks = schedule();
    const firstIndexOf = (topicId: string) =>
      tasks.findIndex((t) => t.topicId === topicId);
    const fr = firstIndexOf(
      "prelims.gs.polity.constitution.fundamental-rights",
    );
    const citizenship = firstIndexOf(
      "prelims.gs.polity.constitution.citizenship",
    );
    expect(fr).toBeGreaterThanOrEqual(0);
    // Citizenship (medium) must not appear before Fundamental Rights
    // (critical) — it may not appear in the horizon at all.
    if (citizenship >= 0) expect(fr).toBeLessThan(citizenship);

    const polityTasks = tasks.filter((t) =>
      t.topicId.startsWith("prelims.gs.polity."),
    );
    expect(polityTasks[0]?.topicId).toBe(
      "prelims.gs.polity.constitution.fundamental-rights",
    );
  });

  it("never schedules two hard sessions back-to-back when avoidable", () => {
    const tasks = schedule();
    const byDate = new Map<string, PlannedTask[]>();
    for (const t of tasks) byDate.set(t.date, [...(byDate.get(t.date) ?? []), t]);
    for (const [, dayTasks] of byDate) {
      for (let i = 1; i < dayTasks.length; i++) {
        const prev = curatedTopicIntel(dayTasks[i - 1].topicId).difficulty;
        const curr = curatedTopicIntel(dayTasks[i].topicId).difficulty;
        expect(prev === "hard" && curr === "hard").toBe(false);
      }
    }
  });
});

describe("automatic revision engine", () => {
  function studiedTopics(nextRevisionAt: string): TopicStateMap {
    // Three topics whose first spaced revision has fallen due.
    const ids = [
      "prelims.gs.polity.constitution.fundamental-rights",
      "prelims.gs.economy.basics.inflation",
      "mains.gs4.probity.corruption",
    ];
    const topics: TopicStateMap = {};
    for (const id of ids) {
      topics[id] = {
        ...DEFAULT_TOPIC_STATE,
        stage: "first-reading",
        lastStudiedAt: addDays(nextRevisionAt, -3),
        nextRevisionAt,
      };
    }
    return topics;
  }

  it("creates due revision tasks automatically, before fresh study", () => {
    const tasks = schedule(studiedTopics(FROM));
    const firstDay = tasks.filter((t) => t.date === FROM);
    const revisions = firstDay.filter((t) => t.kind === "revision");
    expect(revisions.length).toBeGreaterThan(0);
    // Revisions open the day.
    expect(firstDay[0].kind).toBe("revision");
    // Revision tasks target the studied topics only.
    for (const task of tasks.filter((t) => t.kind === "revision")) {
      expect(Object.keys(studiedTopics(FROM))).toContain(task.topicId);
    }
  });

  it("does not schedule revisions before their due date", () => {
    const due = addDays(FROM, 5);
    const tasks = schedule(studiedTopics(due));
    for (const task of tasks.filter((t) => t.kind === "revision")) {
      expect(task.date >= due).toBe(true);
    }
  });

  it("caps revision minutes per day so study never starves", () => {
    // Put 30 topics' revisions overdue at once.
    const topics: TopicStateMap = {};
    for (const id of getLeafIds("prelims.gs.history").slice(0, 30)) {
      topics[id] = {
        ...DEFAULT_TOPIC_STATE,
        stage: "first-reading",
        nextRevisionAt: FROM,
      };
    }
    const tasks = schedule(topics);
    const capacity = dayCapacity(FROM, settings).capacityMinutes;
    const byDate = new Map<string, number>();
    for (const t of tasks.filter((t) => t.kind === "revision")) {
      byDate.set(t.date, (byDate.get(t.date) ?? 0) + t.minutes);
    }
    for (const [, minutes] of byDate) {
      expect(minutes).toBeLessThanOrEqual(
        Math.round(capacity * PLANNER_CONFIG.revisionShareCap),
      );
    }
  });
});

describe("burnout prevention", () => {
  it("inserts a recovery day when no weekly off day is set", () => {
    const tasks = schedule({}, [], { weeklyOffDay: -1 });
    const restOffset = PLANNER_CONFIG.maxConsecutiveStudyDays;
    const restDate = addDays(FROM, restOffset);
    expect(isRecoveryDay(restDate, restOffset, { ...settings, weeklyOffDay: -1 })).toBe(
      true,
    );
    expect(tasks.some((t) => t.date === restDate)).toBe(false);
  });

  it("uses the configured weekly off day as the recovery day", () => {
    expect(isRecoveryDay("2026-07-05", 6, settings)).toBe(true); // Sunday
    expect(isRecoveryDay("2026-07-06", 7, settings)).toBe(false);
  });
});
