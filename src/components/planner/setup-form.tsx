"use client";

import * as React from "react";

import { PLANNER_CONFIG } from "@/lib/planner/config";
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
};

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
    setError(null);
    onSubmit({ prelimsDate, settings });
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
