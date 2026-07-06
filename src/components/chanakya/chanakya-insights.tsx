"use client";

import * as React from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  CalendarClock,
  Flame,
  Lightbulb,
  Sparkles,
  TrendingDown,
} from "lucide-react";

import { withPlannerDefaults } from "@/lib/planner/config";
import { todayStr, formatDateLong } from "@/lib/planner/dates";
import { HEALTH_BAND_META, studyHealth } from "@/lib/planner/health";
import { BURNOUT_META, burnoutIndicator } from "@/lib/planner/analytics";
import { buildRecommendations } from "@/lib/planner/recommendations";
import { upcomingRevisions, weakTopics } from "@/lib/ai/context";
import { PLANNER_INTENTS, type PlannerIntent } from "@/lib/ai/prompts";
import { useAppStore } from "@/store/app-store";
import { useAiStore } from "@/store/ai-store";
import { useMounted } from "@/hooks/use-mounted";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const QUICK: { intent: PlannerIntent; label: string }[] = [
  { intent: "explain-plan", label: "Explain my plan" },
  { intent: "reduce-workload", label: "Reduce workload" },
  { intent: "recover-missed-week", label: "Recover a missed week" },
  { intent: "vacation-mode", label: "Plan a break" },
];

/** The command-center rail: what the deterministic engines know, plus
 * one-click prompts that hand that context to Chanakya. */
export function ChanakyaInsights({ onAsk }: { onAsk: (prompt: string) => void }) {
  const mounted = useMounted();
  const topics = useAppStore((state) => state.topics);
  const tasksMap = useAppStore((state) => state.tasks);
  const storedPlanner = useAppStore((state) => state.planner);
  const examDate = useAppStore((state) => state.examDate);
  const activity = useAiStore((state) => state.activity);

  const data = React.useMemo(() => {
    if (!mounted) return null;
    const today = todayStr();
    const tasks = Object.values(tasksMap);
    const settings = storedPlanner ? withPlannerDefaults(storedPlanner) : null;
    return {
      today,
      health: settings
        ? studyHealth({ tasks, topics, settings, examDate, today })
        : null,
      burnout: settings
        ? burnoutIndicator(tasks, topics, settings, today)
        : null,
      recommendations: settings
        ? buildRecommendations({ tasks, topics, settings, examDate, today }).slice(
            0,
            3,
          )
        : [],
      weak: weakTopics(topics, today, 5),
      revisions: upcomingRevisions(topics, today, 7, 5),
    };
  }, [mounted, topics, tasksMap, storedPlanner, examDate]);

  if (!mounted || !data) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <div className="space-y-4">
      {/* Quick actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Sparkles className="h-4 w-4" /> Quick actions
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {QUICK.map(({ intent, label }) => (
            <button
              key={intent}
              type="button"
              onClick={() => onAsk(PLANNER_INTENTS[intent])}
              className="rounded-full border border-border px-3 py-1 text-xs transition-colors hover:bg-secondary"
            >
              {label}
            </button>
          ))}
        </CardContent>
      </Card>

      {/* Study insights */}
      {data.health && (
        <Panel icon={Activity} title="Study insights">
          <div className="flex items-center justify-between">
            <span className="text-sm">Study health</span>
            <Badge variant="outline" className={HEALTH_BAND_META[data.health.band].className}>
              {data.health.score} · {HEALTH_BAND_META[data.health.band].label}
            </Badge>
          </div>
          <button
            type="button"
            onClick={() => onAsk("Explain my study health / readiness score.")}
            className="mt-2 text-xs text-primary hover:underline"
          >
            Ask Chanakya why →
          </button>
        </Panel>
      )}

      {/* Burnout */}
      {data.burnout && data.burnout.level !== "sustainable" && (
        <Panel icon={Flame} title="Burnout alert" tone="warning">
          <div className="flex items-center justify-between">
            <span className="text-sm">Current level</span>
            <Badge variant="outline" className={BURNOUT_META[data.burnout.level].className}>
              {BURNOUT_META[data.burnout.level].label}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {data.burnout.consecutiveDays} consecutive study days ·{" "}
            {Math.round(data.burnout.hardShare * 100)}% hard material ahead.
          </p>
          <button
            type="button"
            onClick={() => onAsk(PLANNER_INTENTS["reduce-workload"])}
            className="mt-2 text-xs text-primary hover:underline"
          >
            Ask how to ease off →
          </button>
        </Panel>
      )}

      {/* Weak topics */}
      {data.weak.length > 0 && (
        <Panel icon={TrendingDown} title="Weak topics">
          <ul className="space-y-1.5">
            {data.weak.map((weak) => (
              <li key={weak.topicId} className="flex items-center justify-between gap-2 text-sm">
                <Link
                  href={`/syllabus/${weak.topicId}`}
                  className="min-w-0 truncate hover:text-primary"
                >
                  {weak.title}
                </Link>
                <span className="shrink-0 tabular-nums text-xs text-muted-foreground">
                  {weak.confidence.toFixed(1)}/5
                </span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() =>
              onAsk("Which of my weak topics should I fix first, and how?")
            }
            className="mt-2 text-xs text-primary hover:underline"
          >
            Ask for a plan →
          </button>
        </Panel>
      )}

      {/* Upcoming revisions */}
      {data.revisions.length > 0 && (
        <Panel icon={CalendarClock} title="Upcoming revisions">
          <ul className="space-y-1.5">
            {data.revisions.map((due) => (
              <li key={due.topicId} className="flex items-center justify-between gap-2 text-sm">
                <Link
                  href={`/syllabus/${due.topicId}`}
                  className="min-w-0 truncate hover:text-primary"
                >
                  {due.title}
                </Link>
                <span
                  className={
                    due.overdueDays > 0
                      ? "shrink-0 text-xs text-amber-600 dark:text-amber-400"
                      : "shrink-0 text-xs text-muted-foreground"
                  }
                >
                  {due.overdueDays > 0
                    ? `${due.overdueDays}d overdue`
                    : formatDateLong(due.dueDate).replace(/,? \d{4}$/, "")}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {/* Planner recommendations */}
      {data.recommendations.length > 0 && (
        <Panel icon={Lightbulb} title="Recommendations">
          <ul className="space-y-2">
            {data.recommendations.map((rec) => (
              <li key={rec.id}>
                <p className="text-sm font-medium">{rec.title}</p>
                <p className="text-xs text-muted-foreground">{rec.why}</p>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {!storedPlanner && (
        <Card>
          <CardContent className="py-4 text-sm text-muted-foreground">
            Set up the{" "}
            <Link href="/planner" className="text-primary hover:underline">
              planner
            </Link>{" "}
            so Chanakya can reason about your pace, revisions and burnout.
          </CardContent>
        </Card>
      )}

      {/* Recent AI activity */}
      {activity.length > 0 && (
        <Panel icon={AlertTriangle} title="Recent AI activity" muteIcon>
          <ul className="space-y-1">
            {activity.slice(0, 6).map((entry) => (
              <li
                key={entry.id}
                className="flex items-center justify-between gap-2 text-xs text-muted-foreground"
              >
                <span className="truncate">
                  {entry.kind === "action" ? "⚡ " : ""}
                  {entry.label.replace(/-/g, " ")} — {entry.detail}
                </span>
                <span className={entry.ok ? "text-emerald-500" : "text-destructive"}>
                  {entry.ok ? "✓" : "✕"}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}

function Panel({
  icon: Icon,
  title,
  tone,
  muteIcon,
  children,
}: {
  icon: typeof Activity;
  title: string;
  tone?: "warning";
  muteIcon?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card className={tone === "warning" ? "border-amber-500/30" : undefined}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Icon
            className={
              muteIcon
                ? "h-4 w-4"
                : tone === "warning"
                  ? "h-4 w-4 text-amber-500"
                  : "h-4 w-4 text-primary"
            }
          />{" "}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
