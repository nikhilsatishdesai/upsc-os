import { describe, expect, it } from "vitest";

import { ANSWER_FORMATS, answerFormat, PSIR_SECTION_A_UNITS } from "@/data/psir/exam";
import { PSIR_QUESTIONS } from "@/data/psir/questions";
import { PSIR_SOURCES } from "@/data/psir/sources";
import { PSIR_SYNERGY } from "@/data/psir/synergy";
import { THINKERS } from "@/data/psir/thinkers";
import {
  isPsirId,
  nextPsirTopics,
  psirPaperOf,
  psirSections,
  psirTopicLabel,
  psirUnitOf,
  questionsForTopic,
  sourcesForTopic,
  synergyForTopic,
  thinkersForTopic,
} from "@/lib/psir";
import { getChildren, getLeafIds, getNode, isLeaf } from "@/lib/syllabus";
import { DEFAULT_TOPIC_STATE } from "@/lib/stages";
import { curatedTopicIntel } from "@/lib/planner/intel";

const psirLeaves = [
  ...getLeafIds("mains.psir1"),
  ...getLeafIds("mains.psir2"),
];

describe("PSIR syllabus", () => {
  it("adds both optional papers under Mains", () => {
    expect(getNode("mains.psir1")?.title).toMatch(/PSIR Paper I/);
    expect(getNode("mains.psir2")?.title).toMatch(/PSIR Paper II/);
  });

  it("covers the full optional with 100+ trackable topics", () => {
    expect(psirLeaves.length).toBeGreaterThanOrEqual(100);
  });

  it("names every thinker the syllabus lists", () => {
    const western = getChildren("mains.psir1.western-thought").map((n) => n.id.split(".").pop());
    expect(western).toEqual([
      "plato", "aristotle", "machiavelli", "hobbes", "locke", "mill", "marx", "gramsci", "arendt",
    ]);
    const indian = getChildren("mains.psir1.indian-thought").map((n) => n.id.split(".").pop());
    expect(indian).toEqual(["traditions", "sir-syed", "aurobindo", "gandhi", "ambedkar", "mn-roy"]);
  });

  it("splits every paper into Section A and Section B", () => {
    for (const paper of ["mains.psir1", "mains.psir2"] as const) {
      const sections = psirSections(paper);
      expect(sections[0].units.length).toBeGreaterThan(0);
      expect(sections[1].units.length).toBeGreaterThan(0);
      const total = sections[0].units.length + sections[1].units.length;
      expect(total).toBe(getChildren(paper).length);
    }
    for (const unit of PSIR_SECTION_A_UNITS) {
      expect(getNode(unit), unit).toBeDefined();
    }
  });
});

describe("PSIR reference library integrity", () => {
  it("thinkers have unique ids and link only to real PSIR leaf topics", () => {
    const ids = THINKERS.map((thinker) => thinker.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const thinker of THINKERS) {
      expect(thinker.ideas.length, thinker.id).toBeGreaterThan(0);
      expect(thinker.works.length, thinker.id).toBeGreaterThan(0);
      expect(thinker.topicIds.length, thinker.id).toBeGreaterThan(0);
      for (const topicId of thinker.topicIds) {
        const node = getNode(topicId);
        expect(node, `${thinker.id} → ${topicId}`).toBeDefined();
        expect(isLeaf(node!), `${topicId} is a leaf`).toBe(true);
        expect(isPsirId(topicId)).toBe(true);
      }
    }
  });

  it("every syllabus-named Western and Indian thinker has a vault entry", () => {
    const leaves = [
      ...getLeafIds("mains.psir1.western-thought"),
      ...getLeafIds("mains.psir1.indian-thought"),
    ];
    for (const leaf of leaves) {
      expect(thinkersForTopic(leaf).length, leaf).toBeGreaterThan(0);
    }
  });

  it("practice questions have unique ids, valid marks and real leaf topics", () => {
    const ids = PSIR_QUESTIONS.map((question) => question.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(PSIR_QUESTIONS.length).toBeGreaterThan(150);
    for (const question of PSIR_QUESTIONS) {
      expect([10, 15, 20]).toContain(question.marks);
      const node = getNode(question.topicId);
      expect(node, question.topicId).toBeDefined();
      expect(isLeaf(node!)).toBe(true);
    }
  });

  it("every PSIR topic has at least one practice question", () => {
    const missing = psirLeaves.filter((leaf) => questionsForTopic(leaf).length === 0);
    expect(missing).toEqual([]);
  });

  it("sources cover real PSIR units and every unit has a source", () => {
    const ids = PSIR_SOURCES.map((source) => source.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const source of PSIR_SOURCES) {
      for (const id of source.coversIds) {
        expect(getNode(id), `${source.id} → ${id}`).toBeDefined();
      }
    }
    for (const leaf of psirLeaves) {
      expect(sourcesForTopic(leaf).length, leaf).toBeGreaterThan(0);
    }
  });

  it("synergy links every PSIR unit to real GS/Essay/Prelims nodes", () => {
    for (const link of PSIR_SYNERGY) {
      expect(getNode(link.psirId), link.psirId).toBeDefined();
      for (const target of link.targets) {
        expect(getNode(target), `${link.psirId} → ${target}`).toBeDefined();
        expect(isPsirId(target)).toBe(false);
      }
    }
    const units = [...getChildren("mains.psir1"), ...getChildren("mains.psir2")];
    for (const unit of units) {
      expect(synergyForTopic(getLeafIds(unit.id)[0]), unit.id).not.toBeNull();
    }
  });
});

describe("PSIR helpers", () => {
  it("classifies ids by paper and unit", () => {
    expect(isPsirId("mains.psir1.concepts.justice")).toBe(true);
    expect(isPsirId("mains.gs2.ir")).toBe(false);
    expect(isPsirId("mains.psir10")).toBe(false);
    expect(psirPaperOf("mains.psir2.power-centres.china")).toBe("mains.psir2");
    expect(psirUnitOf("mains.psir2.power-centres.china")).toBe("mains.psir2.power-centres");
    expect(psirUnitOf("mains.psir2")).toBeNull();
    expect(psirTopicLabel("mains.psir1.concepts.justice")).toMatch(/^PSIR-I · A3–7/);
  });

  it("finds thinkers and questions for a unit and for a leaf", () => {
    expect(thinkersForTopic("mains.psir1.concepts.justice").map((t) => t.id)).toContain("rawls");
    expect(questionsForTopic("mains.psir1.concepts").length).toBeGreaterThan(5);
  });

  it("answer formats budget about 0.72 minutes per mark", () => {
    for (const format of ANSWER_FORMATS) {
      expect(format.minutes / format.marks).toBeGreaterThan(0.65);
      expect(format.minutes / format.marks).toBeLessThan(0.8);
    }
    expect(answerFormat(15).words).toBe(250);
    expect(answerFormat(99).marks).toBe(10);
  });

  it("suggests unfinished readings first, then critical topics in order", () => {
    const fresh = nextPsirTopics({}, 3);
    expect(fresh).toHaveLength(3);
    for (const id of fresh) {
      expect(curatedTopicIntel(id).priority).toBe("critical");
    }
    expect(fresh[0].startsWith("mains.psir1.")).toBe(true);

    const started = "mains.psir2.regionalisation.nafta";
    const excluded = fresh[0];
    const next = nextPsirTopics(
      {
        [started]: { ...DEFAULT_TOPIC_STATE, stage: "first-reading" },
        [excluded]: { ...DEFAULT_TOPIC_STATE, planState: "excluded" },
      },
      2,
    );
    expect(next[0]).toBe(started);
    expect(next).not.toContain(excluded);
  });
});
