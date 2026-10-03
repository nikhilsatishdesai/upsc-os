"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { getNode } from "@/lib/syllabus";
import { summarizeProgress } from "@/lib/progress";
import { STAGE_META } from "@/lib/stages";
import { useAppStore } from "@/store/app-store";
import { useMounted } from "@/hooks/use-mounted";
import { ProgressRing } from "@/components/ui/progress-ring";
import { cn } from "@/lib/utils";

/** A paper tile on the syllabus overview: ring, covered count, stage bar. */
export function PaperCard({
  paperId,
  badge,
  className,
}: {
  paperId: string;
  badge?: string;
  className?: string;
}) {
  const mounted = useMounted();
  const topics = useAppStore((state) => state.topics);
  const node = getNode(paperId);
  if (!node) return null;
  const summary = summarizeProgress(mounted ? topics : {}, paperId);
  const segments = (
    ["first-reading", "notes-made", "revision-1", "revision-2", "revision-3", "exam-ready"] as const
  ).map((stage) => ({ stage, count: summary.byStage[stage] }));

  return (
    <Link
      href={`/syllabus/${paperId}`}
      className={cn(
        "group flex h-full flex-col rounded-lg border bg-card p-4 transition-colors hover:bg-secondary/60",
        className,
      )}
    >
      <div className="flex items-start gap-4">
        <ProgressRing
          percent={summary.percent}
          size={56}
          strokeWidth={6}
          label={`${summary.percent}% prepared`}
        />
        <div className="min-w-0 flex-1">
          {badge && (
            <span className={cn("tag mb-1", badge === "Optional" ? "tag-purple" : "tag-gray")}>
              {badge}
            </span>
          )}
          <h3 className="flex items-start justify-between gap-2 text-[15px] font-semibold leading-snug">
            <span className="group-hover:underline">{node.title}</span>
            <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </h3>
          {node.description && (
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
              {node.description}
            </p>
          )}
        </div>
      </div>

      <div className="mt-auto pt-4">
        <div
          className="flex h-1.5 w-full overflow-hidden rounded-full bg-secondary"
          aria-hidden
        >
          {segments.map(({ stage, count }) =>
            count > 0 ? (
              <span
                key={stage}
                className={STAGE_META[stage].dot}
                style={{ width: `${(count / summary.total) * 100}%` }}
              />
            ) : null,
          )}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          <span className="font-medium tabular-nums text-foreground">
            {summary.covered}
          </span>{" "}
          of {summary.total} topics started
          {summary.examReady > 0 && ` · ${summary.examReady} exam ready`}
        </p>
      </div>
    </Link>
  );
}

/** Legend for the stage colours used across the syllabus. */
export function StageLegend({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-wrap gap-x-3 gap-y-1.5 text-[11px] text-muted-foreground", className)}>
      {(["first-reading", "notes-made", "revision-1", "revision-2", "revision-3", "exam-ready"] as const).map(
        (stage) => (
          <span key={stage} className="inline-flex items-center gap-1.5">
            <span className={cn("h-2 w-2 rounded-full", STAGE_META[stage].dot)} />
            {STAGE_META[stage].label}
          </span>
        ),
      )}
    </div>
  );
}
