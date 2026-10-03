"use client";

import Link from "next/link";
import { NotebookPen } from "lucide-react";

import { getChildren, isLeaf } from "@/lib/syllabus";
import { PRIORITY_META, getTopicState } from "@/lib/stages";
import { resolveTopicIntel } from "@/lib/planner/intel";
import { summarizeProgress } from "@/lib/progress";
import { useAppStore } from "@/store/app-store";
import { useKnowledgeStore } from "@/store/knowledge-store";
import { useMounted } from "@/hooks/use-mounted";
import { StatusSelect } from "@/components/syllabus/status-select";
import { cn } from "@/lib/utils";

/**
 * The children of a syllabus node, Notion-style: sub-units as child pages,
 * topics as a database table (Name · Status · Priority · Notes).
 */
export function TopicList({ nodeId }: { nodeId: string }) {
  const children = getChildren(nodeId);
  if (children.length === 0) return null;
  const pages = children.filter((child) => !isLeaf(child));
  const leaves = children.filter((child) => isLeaf(child));

  return (
    <div className="space-y-6">
      {pages.length > 0 && (
        <div className="space-y-px">
          {pages.map((child) => (
            <ChildPageRow key={child.id} id={child.id} title={child.title} count={child.leafCount} />
          ))}
        </div>
      )}
      {leaves.length > 0 && (
        <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="border-b text-left text-[13px] text-muted-foreground">
                <th className="py-2 pr-3 font-normal">
                  <span className="font-serif italic">Aa</span> Name
                </th>
                <th className="w-40 border-l px-3 py-2 font-normal">Status</th>
                <th className="w-28 border-l px-3 py-2 font-normal">Priority</th>
                <th className="w-20 border-l px-3 py-2 font-normal">Notes</th>
              </tr>
            </thead>
            <tbody>
              {leaves.map((leaf) => (
                <LeafRow key={leaf.id} id={leaf.id} title={leaf.title} />
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-muted-foreground">
            {leaves.length} topic{leaves.length === 1 ? "" : "s"} · click a name to
            open its workspace
          </p>
        </div>
      )}
    </div>
  );
}

function ChildPageRow({ id, title, count }: { id: string; title: string; count: number }) {
  const mounted = useMounted();
  const topics = useAppStore((state) => state.topics);
  const summary = summarizeProgress(mounted ? topics : {}, id);
  return (
    <Link
      href={`/syllabus/${id}`}
      className="group flex items-center gap-2.5 rounded-md px-1.5 py-1.5 transition-colors hover:bg-secondary/70"
    >
      <span aria-hidden className="text-[17px] leading-none">📄</span>
      <span className="min-w-0 flex-1 truncate border-b border-transparent text-[15px] font-medium underline decoration-border underline-offset-4 group-hover:decoration-foreground/40">
        {title}
      </span>
      <span className="hidden h-1.5 w-28 overflow-hidden rounded-full bg-secondary sm:block">
        <span
          className="block h-full rounded-full bg-success"
          style={{ width: `${summary.percent}%` }}
        />
      </span>
      <span className="w-14 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
        {summary.covered}/{count}
      </span>
    </Link>
  );
}

function LeafRow({ id, title }: { id: string; title: string }) {
  const mounted = useMounted();
  const topic = useAppStore((state) => getTopicState(state.topics, id));
  const hasNote = useKnowledgeStore((state) => !!state.richNotes[id]);
  const intel = resolveTopicIntel(id, mounted ? topic : null);
  const priority = PRIORITY_META[intel.priority];

  return (
    <tr className="group border-b transition-colors hover:bg-secondary/40">
      <td className="py-2 pr-3">
        <Link href={`/syllabus/${id}`} className="flex items-start gap-2 leading-snug">
          <span aria-hidden className="mt-px text-[15px] leading-none">📄</span>
          <span className="font-medium group-hover:underline">{title}</span>
        </Link>
      </td>
      <td className="border-l px-3 py-2">
        <StatusSelect topicId={id} />
      </td>
      <td className="border-l px-3 py-2">
        <span className={cn("tag", priority.badge)}>{priority.label}</span>
      </td>
      <td className="border-l px-3 py-2 text-muted-foreground">
        {mounted && hasNote ? (
          <NotebookPen aria-label="Has notes" className="h-4 w-4" />
        ) : null}
      </td>
    </tr>
  );
}
