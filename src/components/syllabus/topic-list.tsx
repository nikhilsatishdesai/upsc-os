"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { getChildren, isLeaf } from "@/lib/syllabus";
import { StatusSelect } from "@/components/syllabus/status-select";
import { SubtreeProgress } from "@/components/syllabus/subtree-progress";

/** The children of a syllabus node as an interactive list. */
export function TopicList({ nodeId }: { nodeId: string }) {
  const children = getChildren(nodeId);
  if (children.length === 0) return null;

  return (
    <ul className="divide-y rounded-xl border bg-card shadow-sm">
      {children.map((child) => (
        <li key={child.id}>
          {isLeaf(child) ? (
            <div className="flex items-center gap-3 px-4 py-3">
              <span className="flex-1 text-sm">{child.title}</span>
              <StatusSelect topicId={child.id} />
            </div>
          ) : (
            <Link
              href={`/syllabus/${child.id}`}
              className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-secondary/50"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{child.title}</p>
                <p className="text-xs text-muted-foreground">
                  {child.leafCount} topic{child.leafCount === 1 ? "" : "s"}
                </p>
              </div>
              <SubtreeProgress
                nodeId={child.id}
                className="hidden w-28 sm:flex sm:w-40"
              />
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}
