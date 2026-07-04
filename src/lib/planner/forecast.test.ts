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
