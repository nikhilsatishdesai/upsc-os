"use client";

import * as React from "react";
import { RefreshCw, TriangleAlert } from "lucide-react";

import { cn } from "@/lib/utils";
import { withPlannerDefaults } from "@/lib/planner/config";
import { diffDays, todayStr } from "@/lib/planner/dates";
import { computeForecast } from "@/lib/planner/forecast";
import { weeklyCapacityMinutes } from "@/lib/planner/capacity";
import { useAppStore } from "@/store/app-store";
import { useMounted } from "@/hooks/use-mounted";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SetupWizard } from "@/components/planner/setup-wizard";
import { PlannerSettingsDialog } from "@/components/planner/settings-dialog";
import { AskChanakyaMenu } from "@/components/planner/ask-chanakya-menu";
import { TodayView } from "@/components/planner/today-view";
import { WeekView } from "@/components/planner/week-view";
import { AnalyticsView } from "@/components/planner/analytics-view";
import { ScopeView } from "@/components/planner/scope-view";
import { TimetableView } from "@/components/planner/timetable-view";

const TABS = ["Today", "Week", "Timetable", "Scope", "Analytics"] as const;
type Tab = (typeof TABS)[number];
const TAB_EMOJI: Record<Tab, string> = {
  Today: "🎯",
  Week: "📅",
  Timetable: "🕰️",
  Scope: "🧭",
  Analytics: "📈",
};

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
      <PageHeader
        emoji="🗓️"
        title="Planner"
        description={
          <span className="flex flex-wrap items-center gap-2">
            {prelimsDays !== null && prelimsDays >= 0 && (
              <span className="tag tag-yellow">Prelims in {prelimsDays} days</span>
            )}
            {mainsDays >= 0 && (
              <span className="tag tag-purple">Mains in {mainsDays} days</span>
            )}
            <span>Adaptive plan · rebuilt daily · shaped by your timetable</span>
          </span>
        }
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => regeneratePlan()}>
              <RefreshCw /> Replan
            </Button>
            <AskChanakyaMenu />
            <PlannerSettingsDialog />
          </>
        }
      />

      {paceWarning && (
        <p className="callout text-sm">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>
            At the current pace the syllabus finishes after Prelims. You need
            about{" "}
            {Math.round(((paceWarning.requiredDailyMinutes ?? 0) / 60) * 10) /
              10}{" "}
            h/day; your timetable gives about{" "}
            {Math.round((weeklyCapacityMinutes(planner) / 7 / 60) * 10) / 10} h/day.
            Add hours in the Timetable tab, raise emphasis only where it matters,
            or pause low-priority topics in Scope.
          </span>
        </p>
      )}

      <div
        role="tablist"
        aria-label="Planner views"
        className="-mx-4 flex gap-1 overflow-x-auto border-b px-4 scrollbar-none md:mx-0 md:px-0"
      >
        {TABS.map((name) => (
          <button
            key={name}
            role="tab"
            aria-selected={tab === name}
            onClick={() => setTab(name)}
            className={cn(
              "-mb-px inline-flex shrink-0 items-center gap-1.5 border-b-2 px-2 pb-2 pt-1 text-sm font-medium transition-colors",
              tab === name
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <span aria-hidden>{TAB_EMOJI[name]}</span>
            {name}
          </button>
        ))}
      </div>

      {tab === "Today" && <TodayView settings={planner} />}
      {tab === "Week" && <WeekView settings={planner} />}
      {tab === "Timetable" && <TimetableView settings={planner} />}
      {tab === "Scope" && <ScopeView />}
      {tab === "Analytics" && <AnalyticsView settings={planner} />}
    </div>
  );
}
