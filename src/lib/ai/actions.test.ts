import { describe, expect, it, vi } from "vitest";

import {
  describeAiAction,
  executeAiAction,
  parseAiActions,
  stripActionBlock,
  validateAiAction,
  type AiAction,
  type AiActionGateway,
} from "./actions";

const LEAF = "prelims.gs.polity.constitution.fundamental-rights";
const NOT_A_LEAF = "prelims.gs.polity"; // a unit node, not a leaf

describe("validateAiAction", () => {
  it("accepts a well-formed action with a real leaf id", () => {
    expect(
      validateAiAction({ kind: "plan-topic", topicId: LEAF, when: "today" }),
    ).toEqual({ kind: "plan-topic", topicId: LEAF, when: "today" });
  });

  it("rejects unknown or non-leaf topic ids", () => {
    expect(
      validateAiAction({ kind: "plan-topic", topicId: NOT_A_LEAF, when: "today" }),
    ).toBeNull();
    expect(
      validateAiAction({ kind: "set-priority", topicId: "nope", priority: "high" }),
    ).toBeNull();
  });

  it("validates enums and ranges", () => {
    expect(
      validateAiAction({ kind: "set-confidence", topicId: LEAF, confidence: 9 }),
    ).toBeNull();
    expect(
      validateAiAction({ kind: "set-daily-hours", hours: 99 }),
    ).toBeNull();
    expect(
      validateAiAction({ kind: "set-weekend-strategy", strategy: "chaos" }),
    ).toBeNull();
    expect(
      validateAiAction({ kind: "set-priority", topicId: LEAF, priority: null }),
    ).toEqual({ kind: "set-priority", topicId: LEAF, priority: null });
  });

  it("rejects unknown kinds and non-objects", () => {
    expect(validateAiAction({ kind: "launch-missiles" })).toBeNull();
    expect(validateAiAction("nope")).toBeNull();
    expect(validateAiAction(null)).toBeNull();
  });
});

describe("parseAiActions", () => {
  it("extracts a trailing fenced json action block", () => {
    const reply = `Sure, I'll rebuild it.\n\n\`\`\`json\n{"actions":[{"kind":"rebuild-plan"}]}\n\`\`\``;
    const { actions } = parseAiActions(reply);
    expect(actions).toEqual([{ kind: "rebuild-plan" }]);
  });

  it("drops invalid actions and counts them", () => {
    const reply = `\`\`\`json\n{"actions":[{"kind":"rebuild-plan"},{"kind":"bogus"}]}\n\`\`\``;
    const { actions, rejected } = parseAiActions(reply);
    expect(actions).toEqual([{ kind: "rebuild-plan" }]);
    expect(rejected).toBe(1);
  });

  it("returns nothing for a plain prose reply", () => {
    expect(parseAiActions("Just some advice, no actions.").actions).toEqual([]);
  });
});

describe("stripActionBlock", () => {
  it("removes the action block from display text", () => {
    const reply = `Done.\n\n\`\`\`json\n{"actions":[{"kind":"rebuild-plan"}]}\n\`\`\``;
    expect(stripActionBlock(reply)).toBe("Done.");
  });
});

describe("describeAiAction", () => {
  it("produces a human sentence", () => {
    expect(describeAiAction({ kind: "rebuild-plan" })).toMatch(/[Rr]ebuild/);
  });
});

describe("executeAiAction", () => {
  function mockGateway(overrides: Partial<AiActionGateway> = {}): AiActionGateway {
    return {
      regeneratePlan: vi.fn(),
      planTopicNow: vi.fn(),
      moveTask: vi.fn(),
      setTopicMeta: vi.fn(),
      setPlanState: vi.fn(),
      addFlashcard: vi.fn(),
      addQuickNote: vi.fn(),
      addBookmark: vi.fn(),
      updatePlannerSettings: vi.fn(() => true),
      hasTask: vi.fn(() => true),
      ...overrides,
    };
  }

  it("routes each action through the matching gateway method", () => {
    const gateway = mockGateway();
    executeAiAction({ kind: "rebuild-plan" }, gateway);
    expect(gateway.regeneratePlan).toHaveBeenCalledOnce();

    executeAiAction(
      { kind: "add-flashcard", topicId: LEAF, front: "Q", back: "A" },
      gateway,
    );
    expect(gateway.addFlashcard).toHaveBeenCalledWith(LEAF, {
      front: "Q",
      back: "A",
    });
  });

  it("fails gracefully when the target no longer exists", () => {
    const gateway = mockGateway({ hasTask: vi.fn(() => false) });
    const result = executeAiAction(
      { kind: "move-task", taskId: "gone", date: "2026-07-10" },
      gateway,
    );
    expect(result.ok).toBe(false);
    expect(gateway.moveTask).not.toHaveBeenCalled();
  });

  it("reports when the planner is not set up", () => {
    const gateway = mockGateway({ updatePlannerSettings: vi.fn(() => false) });
    const action: AiAction = { kind: "set-weekend-strategy", strategy: "light" };
    expect(executeAiAction(action, gateway).ok).toBe(false);
  });

  it("never throws even if a gateway method does", () => {
    const gateway = mockGateway({
      regeneratePlan: vi.fn(() => {
        throw new Error("boom");
      }),
    });
    const result = executeAiAction({ kind: "rebuild-plan" }, gateway);
    expect(result.ok).toBe(false);
    expect(result.message).toContain("boom");
  });
});
