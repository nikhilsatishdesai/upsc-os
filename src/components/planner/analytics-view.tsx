"use client";

import * as React from "react";

import {
  consistency,
  currentStreak,
  dailyStudyMinutes,
  monthlyCompletion,
  remainingSyllabus,
  upcomingPendingMinutes,
  weeklyCompletion,
} from "@/lib/planner/analytics";
import { PLANNER_CONFIG } from "@/lib/planner/config";
import { formatDayShort } from "@/lib/planner/dates";
import type { PlannerSettings } from "@/lib/planner/types";
import { getStages } from "@/lib/syllabus";
import { useAppStore } from "@/store/app-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SubtreeProgress } from "@/components/syllabus/subtree-progress";

export function AnalyticsView({ settings }: { settings: PlannerSettings }) {
  const tasksMap = useAppStore((state) => state.tasks);
  const topics = useAppStore((state) => state.topics);

  const tasks = React.useMemo(() => Object.values(tasksMap), [tasksMap]);
  const stats = React.useMemo(
    () => ({
      week: weeklyCompletion(tasks),
      month: monthlyCompletion(tasks),
      streak: currentStreak(tasks),
      consistency: consistency(tasks),
      daily: dailyStudyMinutes(tasks),
      upcoming: upcomingPendingMinutes(tasks),
      remaining: remainingSyllabus(topics),
    }),
    [tasks, topics],
  );

  const chartMax = Math.max(
    settings.dailyHours * 60,
    ...stats.daily.map((day) => day.minutes),
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="This week"
          value={`${stats.week.percent}%`}
          detail={`${stats.week.completed}/${stats.week.planned} tasks done`}
        />
        <StatCard
          label="This month"
          value={`${stats.month.percent}%`}
          detail={`${stats.month.completed}/${stats.month.planned} tasks done`}
        />
        <StatCard
          label="Study streak"
          value={`${stats.streak} day${stats.streak === 1 ? "" : "s"}`}
          detail="Consecutive days with completed study"
        />
        <StatCard
          label="Consistency"
          value={`${stats.consistency}%`}
          detail={`Active days in the last ${PLANNER_CONFIG.consistencyWindowDays}`}
        />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Hours studied — last {PLANNER_CONFIG.hoursChartDays} days
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-32 items-end gap-1.5">
            {stats.daily.map((day) => (
              <div
                key={day.date}
                className="group relative flex-1"
                title={`${formatDayShort(day.date)}: ${
                  Math.round((day.minutes / 60) * 10) / 10
                }h`}
              >
                <div
                  className="w-full rounded-t bg-primary/80 transition-colors group-hover:bg-primary"
                  style={{
                    height: `${
                      chartMax === 0 ? 0 : (day.minutes / chartMax) * 100
                    }%`,
                    minHeight: day.minutes > 0 ? "4px" : "1px",
                  }}
                />
              </div>
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
            <span>{formatDayShort(stats.daily[0].date)}</span>
            <span>Today</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Workload
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row
              label="Scheduled over the next 7 days"
              value={`${Math.round((stats.upcoming / 60) * 10) / 10} hours`}
            />
            <Row
              label="Unstudied topics remaining"
              value={`${stats.remaining.topics}`}
            />
            <Row
              label="Estimated study time remaining"
              value={`${Math.round(stats.remaining.minutes / 60)} hours`}
            />
            <Row
              label="Your weekly capacity"
              value={`${
                Math.round(
                  settings.dailyHours *
                    (settings.weeklyOffDay >= 0 ? 6 : 7) *
                    10,
                ) / 10
              } hours`}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Subject-wise preparation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {getStages().map(({ stage, papers }) => (
              <div key={stage.id} className="space-y-2">
                {papers.map((paper) => (
                  <div
                    key={paper.id}
                    className="grid grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] items-center gap-3"
                  >
                    <span className="truncate text-xs">{paper.title}</span>
                    <SubtreeProgress nodeId={paper.id} />
                  </div>
                ))}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">
          {value}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}
