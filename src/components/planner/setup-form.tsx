"use client";

import * as React from "react";

import {
  PLANNER_CONFIG,
  PLANNER_SETTING_DEFAULTS,
} from "@/lib/planner/config";
import { todayStr, WEEKDAY_NAMES } from "@/lib/planner/dates";
import type { PlannerSettings } from "@/lib/planner/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";

export type SetupValues = {
  prelimsDate: string;
  settings: PlannerSettings;
};

const defaultSettings: PlannerSettings = {
  mainsDate: "",
  dailyHours: 6,
  wakeUpTime: "05:30",
  studyStartTime: "06:00",
  weeklyOffDay: 0,
  maxSessionsPerDay: 3,
  sessionMinutes: 60,
  ...PLANNER_SETTING_DEFAULTS,
};

function parseIntervals(text: string): number[] | null {
  const parts = text
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map(Number);
  if (
    parts.length < 1 ||
    parts.length > 6 ||
    parts.some((n) => !Number.isFinite(n) || n < 1 || n > 180)
  ) {
    return null;
  }
  return parts.map(Math.round);
}

/** Planner configuration form, used by first-time setup and the settings
 * dialog alike. Calls `onSubmit` only with validated values. */
export function SetupForm({
  initialPrelimsDate,
  initialSettings,
  submitLabel,
  onSubmit,
}: {
  initialPrelimsDate?: string;
  initialSettings?: PlannerSettings | null;
  submitLabel: string;
  onSubmit: (values: SetupValues) => void;
}) {
  const [prelimsDate, setPrelimsDate] = React.useState(
    initialPrelimsDate ?? "",
  );
  const [settings, setSettings] = React.useState<PlannerSettings>(
    initialSettings ?? defaultSettings,
  );
  const [intervalsText, setIntervalsText] = React.useState(
    (initialSettings ?? defaultSettings).revisionIntervals.join(", "),
  );
  const [error, setError] = React.useState<string | null>(null);

  const update = (patch: Partial<PlannerSettings>) =>
    setSettings((current) => ({ ...current, ...patch }));

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const today = todayStr();
    if (!prelimsDate) return setError("Please set your target Prelims date.");
    if (prelimsDate <= today)
      return setError("The Prelims date must be in the future.");
    if (!settings.mainsDate)
      return setError("Please set your target Mains date.");
    if (settings.mainsDate <= prelimsDate)
      return setError("The Mains date must come after the Prelims date.");
    if (!(settings.dailyHours > 0))
      return setError("Study hours per day must be greater than zero.");
    const intervals = parseIntervals(intervalsText);
    if (!intervals)
      return setError(
        "Revision intervals must be 1–6 comma-separated day counts between 1 and 180, e.g. 3, 10, 30.",
      );
    if ((settings.vacationFrom === null) !== (settings.vacationTo === null))
      return setError("Set both vacation dates, or clear both.");
    if (
      settings.vacationFrom &&
      settings.vacationTo &&
      settings.vacationTo < settings.vacationFrom
    )
      return setError("The vacation end date must be after its start date.");
    setError(null);
    onSubmit({
      prelimsDate,
      settings: { ...settings, revisionIntervals: intervals },
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="setup-prelims">Target Prelims date</Label>
          <Input
            id="setup-prelims"
            type="date"
            value={prelimsDate}
            onChange={(e) => setPrelimsDate(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="setup-mains">Target Mains date</Label>
          <Input
            id="setup-mains"
            type="date"
            value={settings.mainsDate}
            onChange={(e) => update({ mainsDate: e.target.value })}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="setup-hours">Study hours per day</Label>
          <Input
            id="setup-hours"
            type="number"
            min={1}
            max={16}
            step={0.5}
            value={settings.dailyHours}
            onChange={(e) =>
              update({ dailyHours: Number(e.target.value) || 0 })
            }
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="setup-offday">Weekly off day</Label>
          <NativeSelect
            id="setup-offday"
            value={String(settings.weeklyOffDay)}
            onChange={(e) => update({ weeklyOffDay: Number(e.target.value) })}
          >
            <option value="-1">No off day</option>
            {WEEKDAY_NAMES.map((name, index) => (
              <option key={name} value={index}>
                {name}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="setup-wake">Wake-up time</Label>
          <Input
            id="setup-wake"
            type="time"
            value={settings.wakeUpTime}
            onChange={(e) => update({ wakeUpTime: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="setup-start">Study start time</Label>
          <Input
            id="setup-start"
            type="time"
            value={settings.studyStartTime}
            onChange={(e) => update({ studyStartTime: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="setup-sessions">Max study sessions per day</Label>
          <NativeSelect
            id="setup-sessions"
            value={String(settings.maxSessionsPerDay)}
            onChange={(e) =>
              update({ maxSessionsPerDay: Number(e.target.value) })
            }
          >
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="setup-duration">Preferred session duration</Label>
          <NativeSelect
            id="setup-duration"
            value={String(settings.sessionMinutes)}
            onChange={(e) => update({ sessionMinutes: Number(e.target.value) })}
          >
            {PLANNER_CONFIG.sessionOptions.map((minutes) => (
              <option key={minutes} value={minutes}>
                {minutes} minutes
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>

      <div className="space-y-4 rounded-lg border bg-secondary/20 p-4">
        <div>
          <p className="text-sm font-semibold">Advanced planning</p>
          <p className="text-xs text-muted-foreground">
            Fine-tune how the intelligence engine plans. Sensible defaults —
            change only what you care about.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="setup-intervals">Revision intervals (days)</Label>
            <Input
              id="setup-intervals"
              value={intervalsText}
              onChange={(e) => setIntervalsText(e.target.value)}
              placeholder="3, 10, 30"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="setup-maxhard">Max hard sessions per day</Label>
            <NativeSelect
              id="setup-maxhard"
              value={String(settings.maxHardPerDay)}
              onChange={(e) => update({ maxHardPerDay: Number(e.target.value) })}
            >
              {[1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="setup-morning">Morning preference</Label>
            <NativeSelect
              id="setup-morning"
              value={settings.morningDifficulty}
              onChange={(e) =>
                update({
                  morningDifficulty: e.target
                    .value as PlannerSettings["morningDifficulty"],
                })
              }
            >
              <option value="hard-first">Hard topics first</option>
              <option value="easy-first">Warm up with easier work</option>
            </NativeSelect>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="setup-weekend">Weekend strategy</Label>
            <NativeSelect
              id="setup-weekend"
              value={settings.weekendStrategy}
              onChange={(e) =>
                update({
                  weekendStrategy: e.target
                    .value as PlannerSettings["weekendStrategy"],
                })
              }
            >
              <option value="normal">Normal load</option>
              <option value="light">Lighter load</option>
              <option value="revision-heavy">Revision-focused</option>
            </NativeSelect>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="setup-aggressiveness">Planner aggressiveness</Label>
            <NativeSelect
              id="setup-aggressiveness"
              value={settings.aggressiveness}
              onChange={(e) =>
                update({
                  aggressiveness: e.target
                    .value as PlannerSettings["aggressiveness"],
                })
              }
            >
              <option value="relaxed">Relaxed (85% of capacity)</option>
              <option value="standard">Standard</option>
              <option value="intense">Intense (110% of capacity)</option>
            </NativeSelect>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="setup-burnout">Burnout sensitivity</Label>
            <NativeSelect
              id="setup-burnout"
              value={settings.burnoutSensitivity}
              onChange={(e) =>
                update({
                  burnoutSensitivity: e.target
                    .value as PlannerSettings["burnoutSensitivity"],
                })
              }
            >
              <option value="low">Low — barely ease off</option>
              <option value="medium">Medium</option>
              <option value="high">High — ease off early</option>
            </NativeSelect>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="setup-vacation-from">Vacation from</Label>
            <Input
              id="setup-vacation-from"
              type="date"
              value={settings.vacationFrom ?? ""}
              onChange={(e) =>
                update({ vacationFrom: e.target.value || null })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="setup-vacation-to">Vacation to</Label>
            <Input
              id="setup-vacation-to"
              type="date"
              value={settings.vacationTo ?? ""}
              onChange={(e) => update({ vacationTo: e.target.value || null })}
            />
          </div>
        </div>
      </div>

      {settings.maxSessionsPerDay * settings.sessionMinutes <
        settings.dailyHours * 60 && (
        <p className="rounded-md border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-700 dark:text-amber-400">
          Heads-up: {settings.maxSessionsPerDay} session
          {settings.maxSessionsPerDay === 1 ? "" : "s"} ×{" "}
          {settings.sessionMinutes} min ={" "}
          {Math.round(
            ((settings.maxSessionsPerDay * settings.sessionMinutes) / 60) * 10,
          ) / 10}
          h — less than your {settings.dailyHours}h/day. The planner uses the
          smaller number; add sessions or lengthen them to use your full time.
        </p>
      )}

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <Button type="submit">{submitLabel}</Button>
    </form>
  );
}
