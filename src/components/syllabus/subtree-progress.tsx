"use client";

import { summarizeProgress } from "@/lib/progress";
import { useAppStore } from "@/store/app-store";
import { useMounted } from "@/hooks/use-mounted";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

/** Progress bar + "done/total" fraction for the subtree rooted at `nodeId`. */
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
  const progress = useAppStore((state) => state.progress);
  const summary = summarizeProgress(mounted ? progress : {}, nodeId);

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Progress
        value={summary.percent}
        aria-label={`${summary.percent}% complete`}
        className="h-1.5 flex-1"
      />
      {showFraction && (
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {summary.done}/{summary.total}
        </span>
      )}
    </div>
  );
}
