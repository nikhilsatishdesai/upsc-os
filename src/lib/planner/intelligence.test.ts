import { describe, expect, it } from "vitest";

import { buildRecommendations } from "@/lib/planner/recommendations";
import { studyHealth } from "@/lib/planner/health";
import { withPlannerDefaults } from "@/lib/planner/config";
import { addDays } from "@/lib/planner/dates";
import type { PlannedTask, PlannerSettings } from "@/lib/planner/types";
import { DEFAULT_TOPIC_STATE, type TopicStateMap } from "@/lib/stages";
import { getLeafIds } from "@/lib/syllabus";

const TODAY = "2026-07-06";

const settings: PlannerSettings = withPlannerDefaults({
  mainsDate: "2027-09-17",
  dailyHours: 6,
  wakeUpTime: "05:30",
  studyStartTime: "06:00",
  weeklyOffDay: 0,
  maxSessionsPerDay: 3,
  sessionMinutes: 60,
});

function completed(date: string, id: string, minutes = 60): PlannedTask {
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

describe("recommendation engine", () => {
  it("tells the user to add study time when behind, with the reason", () => {
    const recs = buildRecommendations({
      tasks: [],
      topics: {},
      settings,
      examDate: addDays(TODAY, 45), // hopeless with a full syllabus
      today: TODAY,
    });
    const pace = recs.find((r) => r.id === "pace-behind");
    expect(pace).toBeDefined();
    expect(pace!.level).toBe("warning");
    expect(pace!.title).toMatch(/minutes of study per day/);
    expect(pace!.why).toContain("remain before Prelims");
  });

  it("celebrates being ahead of schedule with the numbers", () => {
    const topics: TopicStateMap = {};
    for (const id of getLeafIds("prelims")) {
      topics[id] = { ...DEFAULT_TOPIC_STATE, stage: "exam-ready" };
    }
    for (const id of getLeafIds("mains")) {
      topics[id] = { ...DEFAULT_TOPIC_STATE, stage: "exam-ready" };
    }
    const recs = buildRecommendations({
      tasks: [],
      topics,
      settings,
      examDate: addDays(TODAY, 300),
      today: TODAY,
    });
    const ahead = recs.find((r) => r.id === "ahead");
    expect(ahead).toBeDefined();
    expect(ahead!.why).toContain("probability");
  });

  it("warns about a growing revision backlog", () => {
    const topics: TopicStateMap = {};
    for (const id of getLeafIds("prelims.gs.history").slice(0, 6)) {
      topics[id] = {
        ...DEFAULT_TOPIC_STATE,
        stage: "first-reading",
        nextRevisionAt: addDays(TODAY, -2),
      };
    }
    const recs = buildRecommendations({
      tasks: [],
      topics,
      settings,
      examDate: addDays(TODAY, 700),
      today: TODAY,
    });
    const backlog = recs.find((r) => r.id === "backlog");
    expect(backlog).toBeDefined();
    expect(backlog!.why).toContain("6 revisions");
  });

  it("recognises a strong week", () => {
    // This week (TODAY is a Monday): 6 planned, 5 completed.
    const tasks: PlannedTask[] = [];
    for (let i = 0; i < 5; i++) tasks.push(completed(TODAY, `c${i}`));
    tasks.push({ ...completed(TODAY, "p"), status: "pending", completedAt: null });
    const recs = buildRecommendations({
      tasks,
      topics: {},
      settings,
      examDate: addDays(TODAY, 700),
      today: TODAY,
    });
    expect(recs.find((r) => r.id === "strong-week")).toBeDefined();
  });

  it("every recommendation explains WHY", () => {
    const recs = buildRecommendations({
      tasks: [],
      topics: {},
      settings,
      examDate: addDays(TODAY, 45),
      today: TODAY,
    });
    for (const rec of recs) {
      expect(rec.why.length).toBeGreaterThan(20);
    }
  });
});

describe("study health score", () => {
  it("stays within 0–100 and exposes its component breakdown", () => {
    const health = studyHealth({
      tasks: [],
      topics: {},
      settings,
      examDate: addDays(TODAY, 700),
      today: TODAY,
    });
    expect(health.score).toBeGreaterThanOrEqual(0);
    expect(health.score).toBeLessThanOrEqual(100);
    expect(health.components).toHaveLength(7);
    expect(
      health.components.reduce((sum, c) => sum + c.weight, 0),
    ).toBe(100);
  });

  it("a consistent, on-track aspirant scores higher than an overloaded one", () => {
    // Healthy: everything exam-ready, consistent history.
    const readyTopics: TopicStateMap = {};
    for (const id of getLeafIds("prelims")) {
      readyTopics[id] = {
        ...DEFAULT_TOPIC_STATE,
        stage: "exam-ready",
        confidence: 5,
        lastStudiedAt: TODAY,
      };
    }
    for (const id of getLeafIds("mains")) {
      readyTopics[id] = {
        ...DEFAULT_TOPIC_STATE,
        stage: "exam-ready",
        confidence: 5,
        lastStudiedAt: TODAY,
      };
    }
    const healthyTasks: PlannedTask[] = [];
    for (let i = 1; i <= 20; i++) {
      if (i % 7 === 0) continue;
      healthyTasks.push(completed(addDays(TODAY, -i), `h${i}`));
    }
    const healthy = studyHealth({
      tasks: healthyTasks,
      topics: readyTopics,
      settings,
      examDate: addDays(TODAY, 300),
      today: TODAY,
    });

    // Struggling: nothing studied, exam close, missed work, backlog.
    const strugglingTopics: TopicStateMap = {};
    for (const id of getLeafIds("prelims.gs.history").slice(0, 12)) {
      strugglingTopics[id] = {
        ...DEFAULT_TOPIC_STATE,
        stage: "first-reading",
        nextRevisionAt: addDays(TODAY, -10),
        postponeCount: 3,
      };
    }
    const missedTasks: PlannedTask[] = [];
    for (let i = 1; i <= 10; i++) {
      missedTasks.push({
        ...completed(addDays(TODAY, -i), `m${i}`),
        status: "missed",
        completedAt: null,
      });
    }
    const struggling = studyHealth({
      tasks: missedTasks,
      topics: strugglingTopics,
      settings,
      examDate: addDays(TODAY, 45),
      today: TODAY,
    });

    expect(healthy.score).toBeGreaterThan(struggling.score);
    expect(["excellent", "good"]).toContain(healthy.band);
    expect(["fair", "poor"]).toContain(struggling.band);
  });
});
