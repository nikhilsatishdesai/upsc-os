"use client";

import * as React from "react";
import { RefreshCw, TriangleAlert } from "lucide-react";

import { cn } from "@/lib/utils";
import { withPlannerDefaults } from "@/lib/planner/config";
import { diffDays, todayStr } from "@/lib/planner/dates";
import { computeForecast } from "@/lib/planner/forecast";
import { useAppStore } from "@/store/app-store";
import { useMounted } from "@/hooks/use-mounted";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SetupWizard } from "@/components/planner/setup-wizard";
import { PlannerSettingsDialog } from "@/components/planner/settings-dialog";
import { TodayView } from "@/components/planner/today-view";
import { WeekView } from "@/components/planner/week-view";
import { AnalyticsView } from "@/components/planner/analytics-view";

const TABS = ["Today", "Week", "Analytics"] as const;
type Tab = (typeof TABS)[number];

export function PlannerView() {
  const mounted = useMounted();
  const storedPlanner = useAppStore((state) => state.planner);
  const examDate = useAppStore((state) => state.examDate);
  const topics = useAppStore((state) => state.topics);
  const lastPlannedAt = useAppStore((state) => state.lastPlannedAt);
  const regeneratePlan = useAppStore((state) => state.regeneratePlan);
  const [tab, setTab] = React.useState<Tab>("Today");

  // Settings from older app versions gain the new fields' defaults here.
  const planner = React.useMemo(
    () => (storedPlanner ? withPlannerDefaults(storedPlanner) : null),
    [storedPlanner],
  );

  const tasksMap = useAppStore((state) => state.tasks);
  const paceWarning = React.useMemo(() => {
    if (!mounted || !planner || !examDate) return null;
    const forecast = computeForecast(
      topics,
      planner,
      examDate,
      todayStr(),
      Object.values(tasksMap),
    );
    return forecast.paceStatus === "behind" ? forecast : null;
  }, [mounted, planner, examDate, topics, tasksMap]);

  // Daily adaptive replan: converts missed work back into future capacity.
  React.useEffect(() => {
    if (mounted && planner && lastPlannedAt !== todayStr()) {
      regeneratePlan();
    }
  }, [mounted, planner, lastPlannedAt, regeneratePlan]);

  if (!mounted) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!planner) return <SetupWizard />;

  const today = todayStr();
  const prelimsDays = examDate ? diffDays(today, examDate) : null;
  const mainsDays = diffDays(today, planner.mainsDate);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Planner</h1>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {prelimsDays !== null && prelimsDays >= 0 && (
              <Badge variant="accent">Prelims in {prelimsDays} days</Badge>
            )}
            {mainsDays >= 0 && (
              <Badge variant="secondary">Mains in {mainsDays} days</Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => regeneratePlan()}>
            <RefreshCw /> Replan
          </Button>
          <PlannerSettingsDialog />
        </div>
      </div>

      {paceWarning && (
        <p className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            At the current pace the syllabus finishes after Prelims. You need
            about{" "}
            {Math.round(((paceWarning.requiredDailyMinutes ?? 0) / 60) * 10) /
              10}{" "}
            h/day (currently {planner.dailyHours} h). See Analytics for
            details.
          </span>
        </p>
      )}

      <div
        role="tablist"
        aria-label="Planner views"
        className="inline-flex rounded-lg border bg-secondary/50 p-1"
      >
        {TABS.map((name) => (
          <button
            key={name}
            role="tab"
            aria-selected={tab === name}
            onClick={() => setTab(name)}
            className={cn(
              "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
              tab === name
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {name}
          </button>
        ))}
      </div>

      {tab === "Today" && <TodayView settings={planner} />}
      {tab === "Week" && <WeekView settings={planner} />}
      {tab === "Analytics" && <AnalyticsView settings={planner} />}
    </div>
  );
}
