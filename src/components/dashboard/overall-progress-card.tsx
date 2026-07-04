"use client";

import { TrendingUp } from "lucide-react";

import { getRoots } from "@/lib/syllabus";
import { summarizeMany } from "@/lib/progress";
import { STAGE_META } from "@/lib/stages";
import { useAppStore } from "@/store/app-store";
import { useMounted } from "@/hooks/use-mounted";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressRing } from "@/components/ui/progress-ring";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const rootIds = getRoots().map((root) => root.id);

export function OverallProgressCard() {
  const mounted = useMounted();
  const topics = useAppStore((state) => state.topics);
  const summary = summarizeMany(mounted ? topics : {}, rootIds);

  const reading = summary.byStage["first-reading"];
  const notes = summary.byStage["notes-made"];
  const revising =
    summary.byStage["revision-1"] +
    summary.byStage["revision-2"] +
    summary.byStage["revision-3"];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <TrendingUp className="h-4 w-4" /> Overall preparation
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!mounted ? (
          <Skeleton className="h-16 w-full" />
        ) : (
          <div className="flex items-center gap-5">
            <ProgressRing
              percent={summary.percent}
              label={`${summary.percent}% prepared`}
            />
            <div className="space-y-1.5 text-sm">
              <p>
                <span className="font-semibold tabular-nums">
                  {summary.covered}
                </span>{" "}
                of{" "}
                <span className="font-semibold tabular-nums">
                  {summary.total}
                </span>{" "}
                topics covered
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <StatusCount
                  dot={STAGE_META["first-reading"].dot}
                  label={`${reading} read`}
                />
                <StatusCount
                  dot={STAGE_META["notes-made"].dot}
                  label={`${notes} with notes`}
                />
                <StatusCount
                  dot={STAGE_META["revision-2"].dot}
                  label={`${revising} revising`}
                />
                <StatusCount
                  dot={STAGE_META["exam-ready"].dot}
                  label={`${summary.examReady} exam ready`}
                />
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatusCount({ dot, label }: { dot: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden className={cn("h-2 w-2 rounded-full", dot)} />
      {label}
    </span>
  );
}

