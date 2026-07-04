import { describe, expect, it } from "vitest";

import { generateSchedule } from "@/lib/planner/scheduler";
import { dayCapacity } from "@/lib/planner/capacity";
import { addDays, weekdayOf } from "@/lib/planner/dates";
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

  it("alternates between prelims and mains work", () => {
    const tasks = schedule();
    const stages = tasks.slice(0, 6).map((t) => t.topicId.split(".")[0]);
    expect(stages).toEqual([
      "prelims",
      "mains",
      "prelims",
      "mains",
      "prelims",
      "mains",
    ]);
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
