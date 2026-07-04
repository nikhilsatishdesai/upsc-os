"use client";

import { summarizeProgress } from "@/lib/progress";
import { useAppStore } from "@/store/app-store";
import { useMounted } from "@/hooks/use-mounted";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

/**
 * Weighted preparation bar for the subtree rooted at `nodeId`, with a
 * "covered/total" fraction (covered = at least first reading done).
 */
export function SubtreeProgress({
  nodeId,
  className,
  showFraction = true,
}: {
  nodeId: string;
  className?: string;
  showFraction?: boolean;
}) {
  const mounted = useMounted();
  const topics = useAppStore((state) => state.topics);
  const summary = summarizeProgress(mounted ? topics : {}, nodeId);

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Progress
        value={summary.percent}
        aria-label={`${summary.percent}% prepared`}
        className="h-1.5 flex-1"
      />
      {showFraction && (
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {summary.covered}/{summary.total}
        </span>
      )}
    </div>
  );
}
