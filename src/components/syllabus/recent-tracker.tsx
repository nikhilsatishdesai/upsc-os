"use client";

import * as React from "react";

import { getNode, isLeaf } from "@/lib/syllabus";
import { useAppStore } from "@/store/app-store";

/** Records a visit to a leaf topic so it appears under "Continue where you left off". */
export function RecentTracker({ nodeId }: { nodeId: string }) {
  const touchRecent = useAppStore((state) => state.touchRecent);

  React.useEffect(() => {
    const node = getNode(nodeId);
    if (node && isLeaf(node)) touchRecent(nodeId);
  }, [nodeId, touchRecent]);

  return null;
}
