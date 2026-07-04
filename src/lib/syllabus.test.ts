import { describe, expect, it } from "vitest";

import {
  getAllNodes,
  getBreadcrumbs,
  getChildren,
  getLeafIds,
  getNode,
  getRoots,
  getStages,
  isLeaf,
  TOTAL_LEAF_TOPICS,
} from "@/lib/syllabus";

describe("syllabus data integrity", () => {
  const nodes = getAllNodes();

  it("has globally unique IDs", () => {
    const ids = nodes.map((node) => node.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every node has a non-empty title", () => {
    for (const node of nodes) {
      expect(node.title.trim().length, `title of ${node.id}`).toBeGreaterThan(0);
    }
  });

  it("IDs are lowercase dotted kebab-case slugs", () => {
    for (const node of nodes) {
      expect(node.id).toMatch(/^[a-z0-9-]+(\.[a-z0-9-]+)*$/);
    }
  });

  it("child IDs extend their parent's ID", () => {
    for (const node of nodes) {
      for (const childId of node.childIds) {
        expect(childId.startsWith(node.id + ".")).toBe(true);
      }
    }
  });

  it("leafCount equals the number of leaves returned by getLeafIds", () => {
    for (const node of nodes) {
      expect(getLeafIds(node.id).length, node.id).toBe(node.leafCount);
    }
  });

  it("getLeafIds returns only leaves", () => {
    for (const root of getRoots()) {
      for (const leafId of getLeafIds(root.id)) {
        const leaf = getNode(leafId);
        expect(leaf).toBeDefined();
        expect(isLeaf(leaf!)).toBe(true);
      }
    }
  });

  it("has the expected exam structure", () => {
    const stages = getStages();
    expect(stages.map((s) => s.stage.id)).toEqual(["prelims", "mains"]);
    expect(stages[0].papers).toHaveLength(2); // GS + CSAT
    expect(stages[1].papers).toHaveLength(6); // Essay, GS1-4, languages
  });

  it("covers a substantial syllabus (sanity check against accidental data loss)", () => {
    expect(TOTAL_LEAF_TOPICS).toBeGreaterThan(180);
    expect(nodes.length).toBeGreaterThan(250);
  });

  it("breadcrumbs run from root to the node itself", () => {
    const id = "mains.gs4.probity.corruption";
    const node = getNode(id);
    expect(node).toBeDefined();
    const crumbs = getBreadcrumbs(id);
    expect(crumbs[0].id).toBe("mains");
    expect(crumbs[crumbs.length - 1].id).toBe(id);
    expect(crumbs).toHaveLength(4);
  });

  it("getChildren returns nodes in authored order", () => {
    const prelimsChildren = getChildren("prelims");
    expect(prelimsChildren.map((child) => child.id)).toEqual([
      "prelims.gs",
      "prelims.csat",
    ]);
  });
});
