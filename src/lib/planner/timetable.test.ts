import { describe, expect, it } from "vitest";

import { generateSchedule } from "@/lib/planner/scheduler";
import {
  dayCapacity,
  hoursForWeekday,
  slotStartTime,
  weeklyCapacityMinutes,
} from "@/lib/planner/capacity";
import { addDays, weekdayOf } from "@/lib/planner/dates";
import { paperIdOf } from "@/lib/planner/intel";
import { withPlannerDefaults } from "@/lib/planner/config";
import type { PlannerSettings } from "@/lib/planner/types";
import { DEFAULT_TOPIC_STATE, type TopicStateMap } from "@/lib/stages";

/** Personal-timetable behaviour: per-weekday hours, day focus, subject
 * emphasis and custom block times. */

const base: PlannerSettings = withPlannerDefaults({
  mainsDate: "2027-09-17",
  dailyHours: 6,
  wakeUpTime: "05:30",
  studyStartTime: "06:00",
  weeklyOffDay: 0, // Sunday
  maxSessionsPerDay: 4,
  sessionMinutes: 60,
});

const FROM = "2026-07-06"; // a Monday
const PSIR = ["mains.psir1", "mains.psir2"];

function schedule(
  overrides: Partial<PlannerSettings> = {},
  topics: TopicStateMap = {},
) {
  let n = 0;
  return generateSchedule({
    settings: { ...base, ...overrides },
    topics,
    pinnedTasks: [],
    fromDate: FROM,
    makeId: () => `t${++n}`,
  });
}

describe("per-weekday study hours", () => {
  it("overrides daily hours for a weekday and treats 0 as a rest day", () => {
    const weekdayHours = [null, 2, null, 0, null, null, 8];
    const settings = { ...base, weekdayHours };
    expect(hoursForWeekday(1, settings)).toBe(2);
    expect(hoursForWeekday(2, settings)).toBe(6);

    const monday = dayCapacity(FROM, settings);
    expect(monday.capacityMinutes).toBe(120);
    const wednesday = dayCapacity(addDays(FROM, 2), settings);
    expect(wednesday.isOffDay).toBe(true);
    expect(wednesday.capacityMinutes).toBe(0);

    const tasks = schedule({ weekdayHours });
    expect(tasks.some((task) => weekdayOf(task.date) === 3)).toBe(false);
    const mondayMinutes = tasks
      .filter((task) => task.date === FROM)
      .reduce((sum, task) => sum + task.minutes, 0);
    expect(mondayMinutes).toBeLessThanOrEqual(120);
  });

  it("changes weekly capacity only when the timetable is used", () => {
    expect(weeklyCapacityMinutes(base)).toBe(6 * 4 * 60); // 6 study days × 4h cap
    const lighter = { ...base, weekdayHours: [null, 2, 2, 2, 2, 2, null] };
    // Mon–Fri 2h + Sat 4h (session cap) — Sunday is the off day.
    expect(weeklyCapacityMinutes(lighter)).toBe(5 * 120 + 240);
  });
});

describe("subject focus days", () => {
  it("fills a focus day's fresh study only from the focus papers", () => {
    const dayFocus = [null, PSIR, null, null, null, null, null]; // Mondays
    const tasks = schedule({ dayFocus });
    const monday = tasks.filter((task) => task.date === FROM && task.kind === "study");
    expect(monday.length).toBeGreaterThan(0);
    for (const task of monday) {
      expect(PSIR).toContain(paperIdOf(task.topicId));
    }
    // Other days keep the normal mix.
    const tuesday = tasks.filter((task) => task.date === addDays(FROM, 1));
    expect(tuesday.some((task) => !PSIR.includes(paperIdOf(task.topicId)))).toBe(true);
  });

  it("never blocks due revisions on a focus day", () => {
    const revisionTopic = "prelims.gs.polity.constitution.fundamental-rights";
    const topics: TopicStateMap = {
      [revisionTopic]: {
        ...DEFAULT_TOPIC_STATE,
        stage: "first-reading",
        studiedMinutes: 999,
        nextRevisionAt: FROM,
        lastStudiedAt: addDays(FROM, -3),
      },
    };
    const tasks = schedule({ dayFocus: [null, PSIR, null, null, null, null, null] }, topics);
    expect(
      tasks.some(
        (task) => task.date === FROM && task.kind === "revision" && task.topicId === revisionTopic,
      ),
    ).toBe(true);
  });

  it("falls back to the normal mix when the focus papers have no work left", () => {
    const done: TopicStateMap = {};
    // Mark every Essay topic exam-ready, then focus Mondays on Essay only.
    for (const id of [
      "philosophical", "social", "polity-governance", "economy-development",
      "science-tech", "international", "craft",
    ]) {
      done[`mains.essay.${id}`] = { ...DEFAULT_TOPIC_STATE, stage: "exam-ready" };
    }
    const tasks = schedule({ dayFocus: [null, ["mains.essay"], null, null, null, null, null] }, done);
    expect(tasks.filter((task) => task.date === FROM).length).toBeGreaterThan(0);
  });
});

describe("subject emphasis", () => {
  it("gives a high-emphasis paper proportionally more sessions", () => {
    const count = (tasks: ReturnType<typeof schedule>) =>
      tasks.filter((task) => PSIR.includes(paperIdOf(task.topicId))).length;
    const normal = count(schedule());
    const emphasised = count(
      schedule({ paperWeights: { "mains.psir1": 3, "mains.psir2": 3 } }),
    );
    expect(emphasised).toBeGreaterThan(normal * 1.5);
  });
});

describe("custom block times", () => {
  it("uses the personal afternoon/evening start times", () => {
    const settings = { ...base, afternoonStartTime: "15:30", eveningStartTime: "20:15" };
    expect(slotStartTime("morning", settings)).toBe("06:00");
    expect(slotStartTime("afternoon", settings)).toBe("15:30");
    expect(slotStartTime("evening", settings)).toBe("20:15");
  });
});

describe("typical exam dates", () => {
  it("picks the last Sunday of May and a Friday ~16 weeks later", async () => {
    const { typicalExamDates } = await import("@/lib/planner/dates");
    const before = typicalExamDates("2026-03-01");
    expect(before.prelims).toBe("2026-05-31"); // a Sunday
    expect(weekdayOf(before.mains)).toBe(5);
    const after = typicalExamDates("2026-10-03");
    expect(after.prelims).toBe("2027-05-30");
    expect(after.mains > after.prelims).toBe(true);
  });
});
