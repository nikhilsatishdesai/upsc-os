import { describe, expect, it } from "vitest";

import {
  curatedTopicIntel,
  paperShortName,
  resolveTopicIntel,
  subjectNameOf,
} from "@/lib/planner/intel";
import { DEFAULT_TOPIC_STATE } from "@/lib/stages";
import { getAllNodes, getNode, isLeaf } from "@/lib/syllabus";
import { topicIntelOverrides, unitIntelDefaults } from "@/data/topic-intel";

const FR = "prelims.gs.polity.constitution.fundamental-rights";

describe("intelligence resolution", () => {
  it("resolves curated critical topics (foundational + repeatedly asked)", () => {
    expect(curatedTopicIntel(FR)).toMatchObject({
      priority: "critical",
      difficulty: "hard",
      estimatedMinutes: 150,
    });
    expect(
      curatedTopicIntel("prelims.gs.polity.union-state.parliament").priority,
    ).toBe("critical");
    expect(
      curatedTopicIntel("prelims.gs.polity.constitution.amendment").priority,
    ).toBe("critical");
  });

  it("keeps peripheral topics lower priority", () => {
    expect(
      curatedTopicIntel("prelims.gs.polity.federalism-local.ut-special")
        .priority,
    ).toBe("medium");
    expect(curatedTopicIntel("mains.languages.paper-b.precis").priority).toBe(
      "low",
    );
  });

  it("cascades sub-unit → unit → paper defaults", () => {
    // Sub-unit default (prelims.gs.history.modern → high).
    expect(
      curatedTopicIntel("prelims.gs.history.modern.peasant-tribal").priority,
    ).toBe("high");
    // Paper default (prelims.csat → medium/easy/60).
    expect(curatedTopicIntel("prelims.csat.reasoning")).toMatchObject({
      priority: "medium",
      difficulty: "easy",
      estimatedMinutes: 60,
    });
  });

  it("user overrides always beat curated values", () => {
    const resolved = resolveTopicIntel(FR, {
      ...DEFAULT_TOPIC_STATE,
      priority: "low",
      difficulty: "easy",
      estimatedMinutes: 30,
    });
    expect(resolved.priority).toBe("low");
    expect(resolved.difficulty).toBe("easy");
    expect(resolved.estimatedMinutes).toBe(30);
  });

  it("every leaf resolves to complete, valid intelligence", () => {
    for (const node of getAllNodes()) {
      if (!isLeaf(node)) continue;
      const intel = curatedTopicIntel(node.id);
      expect(intel.estimatedMinutes).toBeGreaterThan(0);
      expect(intel.revisionWeight).toBeGreaterThan(0);
      expect(intel.revisionWeight).toBeLessThanOrEqual(1);
    }
  });

  it("provides subject and paper labels for task cards", () => {
    expect(paperShortName(FR)).toBe("Prelims GS");
    expect(subjectNameOf(FR)).toBe("Indian Polity & Governance");
    expect(paperShortName("mains.psir1.western-thought.plato")).toBe("PSIR-I");
    expect(paperShortName("mains.psir2.power-centres.china")).toBe("PSIR-II");
  });

  it("curated hints only reference real syllabus nodes (typo guard)", () => {
    for (const id of Object.keys(unitIntelDefaults)) {
      expect(getNode(id), `unit default ${id}`).toBeDefined();
    }
    for (const id of Object.keys(topicIntelOverrides)) {
      const node = getNode(id);
      expect(node, `topic override ${id}`).toBeDefined();
      expect(isLeaf(node!), `override ${id} must be a leaf`).toBe(true);
    }
  });

  it("PSIR theory outranks peripheral PSIR material", () => {
    expect(curatedTopicIntel("mains.psir1.concepts.justice").priority).toBe("critical");
    expect(curatedTopicIntel("mains.psir2.regionalisation.nafta").priority).toBe("medium");
  });
});
