import { describe, expect, it } from "vitest";

import { DEFAULT_TOPIC_STATE, type TopicStateMap } from "@/lib/stages";
import {
  buildStudyContext,
  buildTopicContext,
  renderContext,
  upcomingRevisions,
  weakTopics,
  type KnowledgeSnapshot,
  type StudySnapshot,
} from "./context";

const LEAF = "prelims.gs.polity.constitution.fundamental-rights";
const LEAF2 = "prelims.gs.polity.constitution.dpsp";
const TODAY = "2026-07-06";

function emptyKnowledge(): KnowledgeSnapshot {
  return {
    richNotes: {},
    quickNotes: {},
    flashcards: {},
    keywords: {},
    bookRefs: {},
    pyqs: {},
    currentAffairs: {},
    events: [],
  };
}

function study(topics: TopicStateMap): StudySnapshot {
  return {
    topics,
    tasks: {},
    planner: null,
    examDate: "2026-08-01",
    displayName: "Aspirant",
  };
}

describe("buildTopicContext", () => {
  it("gathers the student's own material without manual pasting", () => {
    const knowledge = emptyKnowledge();
    knowledge.richNotes[LEAF] = {
      topicId: LEAF,
      markdown: "Article 14 guarantees equality.",
      createdAt: "",
      updatedAt: "",
      versionTimestamps: [],
      ai: {
        summary: null,
        quiz: null,
        explanation: null,
        difficultyEstimate: null,
        cleanup: null,
      },
    };
    knowledge.keywords["k1"] = {
      id: "k1",
      topicId: LEAF,
      term: "Article 14",
      kind: "article",
      note: "",
      createdAt: "",
    };

    const bundle = buildTopicContext({
      topicId: LEAF,
      study: study({ [LEAF]: { ...DEFAULT_TOPIC_STATE } }),
      knowledge,
      budgetTokens: 5000,
      today: TODAY,
    });

    const rendered = renderContext(bundle);
    expect(rendered).toContain("Fundamental Rights");
    expect(rendered).toContain("Article 14 guarantees equality");
    expect(rendered).toContain("Study state");
    expect(bundle.sources).toContain("your notes");
    expect(bundle.sources).toContain("keywords");
  });

  it("respects the token budget by dropping/truncating lower-priority sections", () => {
    const bundle = buildTopicContext({
      topicId: LEAF,
      study: study({ [LEAF]: { ...DEFAULT_TOPIC_STATE } }),
      knowledge: emptyKnowledge(),
      budgetTokens: 20,
      today: TODAY,
    });
    expect(bundle.totalTokens).toBeLessThanOrEqual(20);
    expect(bundle.sections.length).toBeGreaterThan(0);
  });
});

describe("weakTopics", () => {
  it("ranks studied topics by ascending effective confidence", () => {
    const topics: TopicStateMap = {
      [LEAF]: { ...DEFAULT_TOPIC_STATE, stage: "first-reading", confidence: 4 },
      [LEAF2]: { ...DEFAULT_TOPIC_STATE, stage: "first-reading", confidence: 1 },
    };
    const weak = weakTopics(topics, TODAY, 5);
    expect(weak[0].topicId).toBe(LEAF2); // lowest confidence first
    expect(weak).toHaveLength(2);
  });

  it("ignores untouched and excluded topics", () => {
    const topics: TopicStateMap = {
      [LEAF]: { ...DEFAULT_TOPIC_STATE }, // untouched
      [LEAF2]: {
        ...DEFAULT_TOPIC_STATE,
        stage: "first-reading",
        planState: "excluded",
      },
    };
    expect(weakTopics(topics, TODAY)).toHaveLength(0);
  });
});

describe("upcomingRevisions", () => {
  it("lists due revisions with overdue days", () => {
    const topics: TopicStateMap = {
      [LEAF]: {
        ...DEFAULT_TOPIC_STATE,
        stage: "first-reading",
        revisionCount: 0,
        nextRevisionAt: "2026-07-04", // 2 days overdue relative to TODAY
      },
    };
    const due = upcomingRevisions(topics, TODAY, 7);
    expect(due).toHaveLength(1);
    expect(due[0].overdueDays).toBe(2);
  });
});

describe("buildStudyContext", () => {
  it("summarizes the whole preparation for the mentor", () => {
    const bundle = buildStudyContext({
      study: study({
        [LEAF]: { ...DEFAULT_TOPIC_STATE, stage: "first-reading", confidence: 2 },
      }),
      budgetTokens: 3000,
      today: TODAY,
    });
    const rendered = renderContext(bundle);
    expect(rendered).toContain("Student");
    expect(rendered).toContain("Weak topics");
  });
});
