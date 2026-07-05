"use client";

import * as React from "react";
import Link from "next/link";
import {
  BrainCircuit,
  CircleAlert,
  Info,
  Sparkles,
} from "lucide-react";

import { withPlannerDefaults } from "@/lib/planner/config";
import { todayStr } from "@/lib/planner/dates";
import { HEALTH_BAND_META, studyHealth } from "@/lib/planner/health";
import {
  buildRecommendations,
  type RecommendationLevel,
} from "@/lib/planner/recommendations";
import { useAppStore } from "@/store/app-store";
import { useMounted } from "@/hooks/use-mounted";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const LEVEL_ICON: Record<RecommendationLevel, typeof Info> = {
  warning: CircleAlert,
  info: Info,
  success: Sparkles,
};

const LEVEL_CLASS: Record<RecommendationLevel, string> = {
  warning: "text-amber-600 dark:text-amber-400",
  info: "text-sky-600 dark:text-sky-400",
  success: "text-emerald-600 dark:text-emerald-400",
};

/** The intelligence engine's daily read: health + top recommendations. */
export function InsightsCard() {
  const mounted = useMounted();
  const tasksMap = useAppStore((state) => state.tasks);
  const topics = useAppStore((state) => state.topics);
  const storedPlanner = useAppStore((state) => state.planner);
  const examDate = useAppStore((state) => state.examDate);

  const data = React.useMemo(() => {
    if (!mounted || !storedPlanner) return null;
    const settings = withPlannerDefaults(storedPlanner);
    const tasks = Object.values(tasksMap);
    const today = todayStr();
    return {
      health: studyHealth({ tasks, topics, settings, examDate, today }),
      recommendations: buildRecommendations({
        tasks,
        topics,
        settings,
        examDate,
        today,
      }).slice(0, 3),
    };
  }, [mounted, tasksMap, topics, storedPlanner, examDate]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between gap-2 text-sm font-medium text-muted-foreground">
          <span className="flex items-center gap-2">
            <BrainCircuit className="h-4 w-4" /> Insights
          </span>
          {data && (
            <Badge
              variant="outline"
              className={HEALTH_BAND_META[data.health.band].className}
            >
              Health {data.health.score} ·{" "}
              {HEALTH_BAND_META[data.health.band].label}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!mounted ? (
          <Skeleton className="h-24 w-full" />
        ) : !data ? (
          <p className="text-sm text-muted-foreground">
            Set up the{" "}
            <Link href="/planner" className="text-primary hover:underline">
              planner
            </Link>{" "}
            and the intelligence engine starts reading your preparation:
            pace, burnout, revision backlog and personalised recommendations.
          </p>
        ) : data.recommendations.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            All quiet — keep following today&apos;s plan. Recommendations
            appear here the moment something needs attention.
          </p>
        ) : (
          <ul className="space-y-3">
            {data.recommendations.map((rec) => {
              const Icon = LEVEL_ICON[rec.level];
              return (
                <li key={rec.id} className="flex gap-2.5">
                  <Icon
                    aria-hidden
                    className={`mt-0.5 h-4 w-4 shrink-0 ${LEVEL_CLASS[rec.level]}`}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{rec.title}</p>
                    <p className="text-xs text-muted-foreground">{rec.why}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
