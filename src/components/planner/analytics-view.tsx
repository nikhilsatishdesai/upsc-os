"use client";

import * as React from "react";

import {
  BURNOUT_META,
  burnoutIndicator,
  consistency,
  currentStreak,
  dailyStudyMinutes,
  difficultyDistribution,
  monthlyCompletion,
  recentMissed,
  remainingSyllabus,
  revisionShare,
  subjectDistribution,
  upcomingPendingMinutes,
  weeklyCompletion,
} from "@/lib/planner/analytics";
import { computeForecast, PACE_META } from "@/lib/planner/forecast";
import { HEALTH_BAND_META, studyHealth } from "@/lib/planner/health";
import { PLANNER_CONFIG } from "@/lib/planner/config";
import {
  formatDateLong,
  formatDayShort,
  startOfWeek,
  todayStr,
} from "@/lib/planner/dates";
import type { PlannerSettings } from "@/lib/planner/types";
import { DIFFICULTY_META, type Difficulty } from "@/lib/stages";
import { getStages } from "@/lib/syllabus";
import { useAppStore } from "@/store/app-store";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SubtreeProgress } from "@/components/syllabus/subtree-progress";
import { cn } from "@/lib/utils";

function hours(minutes: number): string {
  return `${Math.round((minutes / 60) * 10) / 10}h`;
}

export function AnalyticsView({ settings }: { settings: PlannerSettings }) {
  const tasksMap = useAppStore((state) => state.tasks);
  const topics = useAppStore((state) => state.topics);
  const examDate = useAppStore((state) => state.examDate);
  const snapshotsMap = useAppStore((state) => state.snapshots);

  const tasks = React.useMemo(() => Object.values(tasksMap), [tasksMap]);
  const stats = React.useMemo(() => {
    const today = todayStr();
    const daily = dailyStudyMinutes(tasks, PLANNER_CONFIG.hoursChartDays, today);
    const weekStart = startOfWeek(today);
    let weekPlannedMinutes = 0;
    let weekCompletedMinutes = 0;
    for (const task of tasks) {
      if (task.date < weekStart || task.date > today) continue;
      if (task.status === "skipped") continue;
      weekPlannedMinutes += task.minutes;
      if (task.status === "completed") weekCompletedMinutes += task.minutes;
    }
    return {
      week: weeklyCompletion(tasks, today),
      month: monthlyCompletion(tasks, today),
      streak: currentStreak(tasks, today),
      consistency: consistency(tasks, PLANNER_CONFIG.consistencyWindowDays, today),
      daily,
      avgDailyOutput: Math.round(
        daily.reduce((sum, day) => sum + day.minutes, 0) / daily.length,
      ),
      efficiency:
        weekPlannedMinutes === 0
          ? null
          : Math.round((weekCompletedMinutes / weekPlannedMinutes) * 100),
      missed14: recentMissed(tasks, 14, today).length,
      upcoming: upcomingPendingMinutes(tasks, 7, today),
      remaining: remainingSyllabus(topics),
      forecast: computeForecast(topics, settings, examDate, today, tasks),
      burnout: burnoutIndicator(tasks, topics, settings, today),
      health: studyHealth({ tasks, topics, settings, examDate, today }),
      trend: Object.entries(snapshotsMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-30),
      subjects: subjectDistribution(tasks),
      difficulty: difficultyDistribution(tasks, topics, today, 7),
      revisions: revisionShare(tasks, today, 7),
    };
  }, [tasks, topics, settings, examDate, snapshotsMap]);

  const chartMax = Math.max(
    settings.dailyHours * 60,
    ...stats.daily.map((day) => day.minutes),
  );
  const difficultyTotal =
    stats.difficulty.easy + stats.difficulty.medium + stats.difficulty.hard;
  const subjectMax = Math.max(1, ...stats.subjects.map((s) => s.minutes));

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

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between gap-2 text-sm font-medium text-muted-foreground">
              Completion forecast
              {stats.forecast.paceStatus && (
                <Badge
                  variant="outline"
                  className={PACE_META[stats.forecast.paceStatus].className}
                >
                  {PACE_META[stats.forecast.paceStatus].label}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row
              label="Remaining workload (readings + revisions)"
              value={`${Math.round(stats.forecast.totalRemainingMinutes / 60)} hours`}
            />
            <Row
              label="Your capacity"
              value={`${hours(stats.forecast.weeklyCapacityMinutes)} / week · ${hours(
                stats.forecast.monthlyCapacityMinutes,
              )} / month`}
            />
            <Row
              label="Observed pace (last 14 days)"
              value={
                stats.forecast.actualDailyMinutes === null
                  ? "building history…"
                  : `${hours(stats.forecast.actualDailyMinutes)} / day vs ${hours(
                      stats.forecast.averageDailyMinutes,
                    )} planned`
              }
            />
            <Row
              label="Days required at effective pace"
              value={
                stats.forecast.daysAvailable !== null
                  ? `${stats.forecast.daysRequired} of ${stats.forecast.daysAvailable} available`
                  : String(stats.forecast.daysRequired)
              }
            />
            <Row
              label="Expected completion"
              value={
                stats.forecast.expectedCompletionDate
                  ? `${formatDateLong(stats.forecast.expectedCompletionDate)} ± ${stats.forecast.confidenceIntervalDays}d`
                  : "—"
              }
            />
            <Row
              label="Finish before Prelims / Mains"
              value={`${stats.forecast.prelimsProbability ?? "—"}% · ${
                stats.forecast.mainsProbability ?? "—"
              }%`}
            />
            {stats.forecast.paceStatus === "behind" &&
              stats.forecast.requiredDailyMinutes !== null && (
                <p className="rounded-md border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-600 dark:text-red-400">
                  At the current pace you will not finish before Prelims. You
                  would need about{" "}
                  {Math.round((stats.forecast.requiredDailyMinutes / 60) * 10) /
                    10}{" "}
                  hours/day — consider raising daily hours in Planner settings
                  or trimming Low-priority topics.
                </p>
              )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between gap-2 text-sm font-medium text-muted-foreground">
              Burnout indicator
              <Badge
                variant="outline"
                className={BURNOUT_META[stats.burnout.level].className}
              >
                {BURNOUT_META[stats.burnout.level].label}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-3">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    stats.burnout.level === "high"
                      ? "bg-red-500"
                      : stats.burnout.level === "elevated"
                        ? "bg-amber-500"
                        : "bg-emerald-500",
                  )}
                  style={{ width: `${stats.burnout.score}%` }}
                />
              </div>
              <span className="text-sm font-semibold tabular-nums">
                {stats.burnout.score}
              </span>
            </div>
            <Row
              label="Coming week's load vs capacity"
              value={`${Math.round(stats.burnout.loadRatio * 100)}%`}
            />
            <Row
              label="Consecutive study days"
              value={String(stats.burnout.consecutiveDays)}
            />
            <Row
              label="Hard material ahead"
              value={`${Math.round(stats.burnout.hardShare * 100)}%`}
            />
            <Row
              label="Revision share of the week"
              value={`${stats.revisions.percent}%`}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between gap-2 text-sm font-medium text-muted-foreground">
              Study health
              <Badge
                variant="outline"
                className={HEALTH_BAND_META[stats.health.band].className}
              >
                {stats.health.score} · {HEALTH_BAND_META[stats.health.band].label}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.health.components.map((component) => (
              <div key={component.key} className="flex items-center gap-2">
                <span className="w-32 shrink-0 text-xs text-muted-foreground">
                  {component.label}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      component.score >= 60
                        ? "bg-emerald-500"
                        : component.score >= 40
                          ? "bg-amber-500"
                          : "bg-red-500",
                    )}
                    style={{ width: `${component.score}%` }}
                  />
                </div>
                <span className="w-8 text-right text-xs tabular-nums text-muted-foreground">
                  {component.score}
                </span>
              </div>
            ))}
            <p className="pt-1 text-xs text-muted-foreground">
              A planning instrument, not a game score — each bar tells the
              engine what to protect next.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Intelligence trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.trend.length < 2 ? (
              <p className="text-sm text-muted-foreground">
                Trends appear after a few days of use — one snapshot is
                recorded per day.
              </p>
            ) : (
              <div className="space-y-4">
                <TrendChart
                  label="Health score"
                  points={stats.trend.map(([date, snap]) => ({
                    date,
                    value: snap.healthScore ?? 0,
                  }))}
                  barClass="bg-emerald-500/70"
                />
                <TrendChart
                  label="Burnout score"
                  points={stats.trend.map(([date, snap]) => ({
                    date,
                    value: snap.burnoutScore,
                  }))}
                  barClass="bg-amber-500/70"
                />
                <Row
                  label="Workload change over this window"
                  value={`${
                    Math.round(
                      ((stats.trend[0][1].remainingMinutes -
                        stats.trend[stats.trend.length - 1][1]
                          .remainingMinutes) /
                        60) *
                        10,
                    ) / 10
                  }h cleared`}
                />
              </div>
            )}
          </CardContent>
        </Card>
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
                title={`${formatDayShort(day.date)}: ${hours(day.minutes)}`}
              >
                <div
                  className="w-full rounded-t bg-primary/80 transition-colors group-hover:bg-primary"
                  style={{
                    height: `${chartMax === 0 ? 0 : (day.minutes / chartMax) * 100}%`,
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
              Workload & distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row
              label="Scheduled over the next 7 days"
              value={hours(stats.upcoming)}
            />
            <Row
              label="Unstudied topics remaining"
              value={`${stats.remaining.topics}`}
            />
            <Row
              label="Revisions vs study (coming week)"
              value={`${hours(stats.revisions.revisionMinutes)} / ${hours(stats.revisions.studyMinutes)}`}
            />
            <Row
              label="Average daily output (14 days)"
              value={`${hours(stats.avgDailyOutput)} / day`}
            />
            <Row
              label="Missed sessions (14 days)"
              value={String(stats.missed14)}
            />
            <Row
              label="Weekly planner efficiency"
              value={
                stats.efficiency === null
                  ? "—"
                  : `${stats.efficiency}% of planned minutes done`
              }
            />
            <div className="space-y-1.5 pt-1">
              <p className="text-xs font-medium text-muted-foreground">
                Coming week by difficulty
              </p>
              {(Object.keys(stats.difficulty) as Difficulty[]).map((level) => (
                <div key={level} className="flex items-center gap-2">
                  <span className="w-16 text-xs text-muted-foreground">
                    {DIFFICULTY_META[level].label}
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-primary/70"
                      style={{
                        width: `${
                          difficultyTotal === 0
                            ? 0
                            : (stats.difficulty[level] / difficultyTotal) * 100
                        }%`,
                      }}
                    />
                  </div>
                  <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">
                    {hours(stats.difficulty[level])}
                  </span>
                </div>
              ))}
            </div>
            {stats.subjects.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Hours studied by paper
                </p>
                {stats.subjects.slice(0, 6).map((subject) => (
                  <div key={subject.paper} className="flex items-center gap-2">
                    <span className="w-16 truncate text-xs text-muted-foreground">
                      {subject.paper}
                    </span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-chart-2"
                        style={{
                          width: `${(subject.minutes / subjectMax) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">
                      {hours(subject.minutes)}
                    </span>
                  </div>
                ))}
              </div>
            )}
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
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

function TrendChart({
  label,
  points,
  barClass,
}: {
  label: string;
  points: { date: string; value: number }[];
  barClass: string;
}) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex h-12 items-end gap-px">
        {points.map((point) => (
          <div
            key={point.date}
            className="group relative flex-1"
            title={`${formatDayShort(point.date)}: ${point.value}`}
          >
            <div
              className={cn("w-full rounded-t", barClass)}
              style={{
                height: `${Math.max(2, point.value)}%`,
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
