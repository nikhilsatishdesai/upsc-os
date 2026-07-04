import { syllabusTree, type SyllabusNodeDef } from "@/data/syllabus";

/** A syllabus node with computed structure: full dotted ID, parent/children links, leaf counts. */
export type SyllabusNode = {
  id: string;
  title: string;
  description?: string;
  depth: number;
  parentId: string | null;
  childIds: string[];
  /** Number of leaf topics in this subtree (1 for a leaf itself). */
  leafCount: number;
  /** Titles of all ancestors, root first (excludes this node). */
  pathTitles: string[];
};

function buildIndex() {
  const byId = new Map<string, SyllabusNode>();
  const rootIds: string[] = [];

  const walk = (
    def: SyllabusNodeDef,
    parentId: string | null,
    depth: number,
    pathTitles: string[],
  ): SyllabusNode => {
    const id = parentId ? `${parentId}.${def.id}` : def.id;
    if (byId.has(id)) {
      throw new Error(`Duplicate syllabus node id: ${id}`);
    }
    const node: SyllabusNode = {
      id,
      title: def.title,
      description: def.description,
      depth,
      parentId,
      childIds: [],
      leafCount: 0,
      pathTitles,
    };
    byId.set(id, node);

    if (def.children && def.children.length > 0) {
      for (const childDef of def.children) {
        const child = walk(childDef, id, depth + 1, [
          ...pathTitles,
          def.title,
        ]);
        node.childIds.push(child.id);
        node.leafCount += child.leafCount;
      }
    } else {
      node.leafCount = 1;
    }
    return node;
  };

  for (const def of syllabusTree) {
    rootIds.push(walk(def, null, 0, []).id);
  }
  return { byId, rootIds };
}

const { byId, rootIds } = buildIndex();

export function getNode(id: string): SyllabusNode | undefined {
  return byId.get(id);
}

export function getRoots(): SyllabusNode[] {
  return rootIds.map((id) => byId.get(id)!);
}

export function getChildren(id: string): SyllabusNode[] {
  const node = byId.get(id);
  if (!node) return [];
  return node.childIds.map((childId) => byId.get(childId)!);
}

export function getAllNodes(): SyllabusNode[] {
  return Array.from(byId.values());
}

export function isLeaf(node: SyllabusNode): boolean {
  return node.childIds.length === 0;
}

/** All leaf-topic IDs inside the subtree rooted at `id` (the id itself if it is a leaf). */
export function getLeafIds(id: string): string[] {
  const node = byId.get(id);
  if (!node) return [];
  if (node.childIds.length === 0) return [node.id];
  const leaves: string[] = [];
  const stack = [...node.childIds];
  while (stack.length > 0) {
    const current = byId.get(stack.pop()!)!;
    if (current.childIds.length === 0) {
      leaves.push(current.id);
    } else {
      stack.push(...current.childIds);
    }
  }
  return leaves;
}

/** Ancestors from root down to (and including) the node itself. */
export function getBreadcrumbs(id: string): SyllabusNode[] {
  const crumbs: SyllabusNode[] = [];
  let current = byId.get(id);
  while (current) {
    crumbs.unshift(current);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return crumbs;
}

/** The exam papers (depth-1 nodes) grouped under their stage (depth-0 nodes). */
export function getStages(): { stage: SyllabusNode; papers: SyllabusNode[] }[] {
  return getRoots().map((stage) => ({
    stage,
    papers: getChildren(stage.id),
  }));
}

/** Total number of leaf topics across the entire syllabus. */
export const TOTAL_LEAF_TOPICS = getRoots().reduce(
  (sum, root) => sum + root.leafCount,
  0,
);
