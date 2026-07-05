import { describe, expect, it } from "vitest";

import { computeForecast } from "@/lib/planner/forecast";
import { burnoutIndicator } from "@/lib/planner/analytics";
import { weeklyCapacityMinutes } from "@/lib/planner/capacity";
import { addDays } from "@/lib/planner/dates";
import type { PlannedTask, PlannerSettings } from "@/lib/planner/types";
import { DEFAULT_TOPIC_STATE, type TopicStateMap } from "@/lib/stages";
import { getAllNodes, isLeaf } from "@/lib/syllabus";

const settings: PlannerSettings = {
  mainsDate: "2027-09-17",
  dailyHours: 6,
  wakeUpTime: "05:30",
  studyStartTime: "06:00",
  weeklyOffDay: 0,
  maxSessionsPerDay: 3,
  sessionMinutes: 60,
};

const TODAY = "2026-07-06";

describe("study capacity engine / completion forecast", () => {
  it("computes capacity from settings", () => {
    // 3 sessions × 60 min × 6 study days.
    expect(weeklyCapacityMinutes(settings)).toBe(1080);
    const forecast = computeForecast({}, settings, "2027-05-30", TODAY);
    expect(forecast.weeklyCapacityMinutes).toBe(1080);
    expect(forecast.monthlyCapacityMinutes).toBe(Math.round((1080 * 30) / 7));
    expect(forecast.averageDailyMinutes).toBe(Math.round(1080 / 7));
  });

  it("counts remaining readings plus all pending revisions as workload", () => {
    const forecast = computeForecast({}, settings, "2027-05-30", TODAY);
    expect(forecast.remainingStudyMinutes).toBeGreaterThan(0);
    expect(forecast.remainingRevisionMinutes).toBeGreaterThan(0);
    expect(forecast.totalRemainingMinutes).toBe(
      forecast.remainingStudyMinutes + forecast.remainingRevisionMinutes,
    );
    expect(forecast.expectedCompletionDate).toBe(
      addDays(TODAY, forecast.daysRequired),
    );
  });

  it("drops to zero when everything is exam-ready", () => {
    const topics: TopicStateMap = {};
    for (const node of getAllNodes()) {
      if (isLeaf(node)) {
        topics[node.id] = { ...DEFAULT_TOPIC_STATE, stage: "exam-ready" };
      }
    }
    const forecast = computeForecast(topics, settings, "2027-05-30", TODAY);
    expect(forecast.totalRemainingMinutes).toBe(0);
    expect(forecast.daysRequired).toBe(0);
    expect(forecast.paceStatus).toBe("on-track");
  });

  it("warns when the current pace cannot finish before the exam", () => {
    const soon = addDays(TODAY, 30);
    const forecast = computeForecast({}, settings, soon, TODAY);
    expect(forecast.paceStatus).toBe("behind");
    expect(forecast.requiredDailyMinutes).toBeGreaterThan(
      forecast.averageDailyMinutes,
    );
  });

  it("reports on-track with a comfortably distant exam", () => {
    const forecast = computeForecast({}, settings, addDays(TODAY, 900), TODAY);
    expect(forecast.paceStatus).toBe("on-track");
  });
});

describe("forecast v2: probabilities and observed pace", () => {
  function completedTask(
    date: string,
    minutes: number,
    id: string,
  ): PlannedTask {
    return {
      id,
      topicId: "prelims.csat.comprehension",
      date,
      slot: "morning",
      minutes,
      kind: "study",
      status: "completed",
      completedAt: `${date}T10:00:00.000Z`,
      createdBy: "auto",
    };
  }

  it("probability rises with slack and stays within 0–100", () => {
    const soon = computeForecast({}, settings, addDays(TODAY, 60), TODAY);
    const distant = computeForecast({}, settings, addDays(TODAY, 900), TODAY);
    expect(distant.prelimsProbability!).toBeGreaterThan(
      soon.prelimsProbability!,
    );
    for (const p of [soon.prelimsProbability!, distant.prelimsProbability!]) {
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(100);
    }
    // Mains is later than Prelims, so its probability can't be lower.
    expect(distant.mainsProbability!).toBeGreaterThanOrEqual(
      distant.prelimsProbability! > 99 ? 0 : distant.prelimsProbability!,
    );
  });

  it("ignores observed pace until there is enough history", () => {
    const tasks = [completedTask(addDays(TODAY, -1), 60, "one")];
    const forecast = computeForecast({}, settings, EXAM_FAR, TODAY, tasks);
    expect(forecast.actualDailyMinutes).toBeNull();
    expect(forecast.effectiveDailyMinutes).toBe(forecast.averageDailyMinutes);
  });

  it("a slow observed pace lengthens the forecast honestly", () => {
    // 14 days of history, but only ~30 minutes/day actually completed.
    const tasks: PlannedTask[] = [];
    for (let i = 1; i <= 14; i++) {
      tasks.push(completedTask(addDays(TODAY, -i), 30, `t${i}`));
    }
    const withHistory = computeForecast({}, settings, EXAM_FAR, TODAY, tasks);
    const withoutHistory = computeForecast({}, settings, EXAM_FAR, TODAY);
    expect(withHistory.actualDailyMinutes).toBe(30);
    expect(withHistory.effectiveDailyMinutes).toBeLessThan(
      withoutHistory.effectiveDailyMinutes,
    );
    expect(withHistory.daysRequired).toBeGreaterThan(
      withoutHistory.daysRequired,
    );
    expect(withHistory.confidenceIntervalDays).toBeGreaterThan(0);
  });
});

const EXAM_FAR = addDays(TODAY, 700);

describe("burnout indicator", () => {
  it("is sustainable with an empty plan", () => {
    const result = burnoutIndicator([], {}, settings, TODAY);
    expect(result.level).toBe("sustainable");
    expect(result.score).toBeLessThan(40);
  });

  it("rises with a fully loaded hard week and a long streak", () => {
    const tasks: PlannedTask[] = [];
    // 14 straight days of completed study (fatigue)…
    for (let i = 14; i >= 1; i--) {
      tasks.push({
        id: `done-${i}`,
        topicId: "prelims.gs.polity.constitution.fundamental-rights",
        date: addDays(TODAY, -i),
        slot: "morning",
        minutes: 60,
        kind: "study",
        status: "completed",
        completedAt: `${addDays(TODAY, -i)}T10:00:00.000Z`,
        createdBy: "auto",
      });
    }
    // …plus a coming week fully packed with a hard topic.
    for (let i = 0; i < 6; i++) {
      for (let s = 0; s < 3; s++) {
        tasks.push({
          id: `plan-${i}-${s}`,
          topicId: "prelims.gs.polity.constitution.fundamental-rights",
          date: addDays(TODAY, i),
          slot: "morning",
          minutes: 60,
          kind: "study",
          status: "pending",
          completedAt: null,
          createdBy: "auto",
        });
      }
    }
    // Make the streak reach "today".
    tasks.push({
      id: "done-today",
      topicId: "prelims.gs.polity.constitution.fundamental-rights",
      date: TODAY,
      slot: "morning",
      minutes: 60,
      kind: "study",
      status: "completed",
      completedAt: `${TODAY}T08:00:00.000Z`,
      createdBy: "auto",
    });
    const result = burnoutIndicator(tasks, {}, settings, TODAY);
    expect(result.level).toBe("high");
    expect(result.consecutiveDays).toBeGreaterThanOrEqual(14);
    expect(result.hardShare).toBe(1);
  });
});
