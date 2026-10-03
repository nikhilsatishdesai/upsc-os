"use client";

import * as React from "react";
import { Check, RotateCcw } from "lucide-react";

import { getStages } from "@/lib/syllabus";
import {
  PAPER_WEIGHT_OPTIONS,
  PLANNER_SETTING_DEFAULTS,
} from "@/lib/planner/config";
import {
  dayCapacity,
  hoursForWeekday,
  weeklyCapacityMinutes,
} from "@/lib/planner/capacity";
import { addDays, todayStr, weekdayOf, WEEKDAY_NAMES } from "@/lib/planner/dates";
import { paperShortName } from "@/lib/planner/intel";
import type { PlannerSettings } from "@/lib/planner/types";
import { useAppStore } from "@/store/app-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { cn } from "@/lib/utils";

/** Display order: Monday first (index into the Sunday-based arrays). */
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

const FOCUS_PRESETS: { key: string; label: string; papers: string[] }[] = [
  { key: "psir", label: "PSIR optional (both papers)", papers: ["mains.psir1", "mains.psir2"] },
  { key: "gs-mains", label: "GS Mains (GS I–IV)", papers: ["mains.gs1", "mains.gs2", "mains.gs3", "mains.gs4"] },
  { key: "prelims", label: "Prelims (GS + CSAT)", papers: ["prelims.gs", "prelims.csat"] },
  { key: "mains-all", label: "All Mains papers", papers: ["mains.essay", "mains.gs1", "mains.gs2", "mains.gs3", "mains.gs4", "mains.psir1", "mains.psir2"] },
];

const ALL_PAPERS = getStages().flatMap(({ papers }) => papers);

function focusValue(papers: string[] | null): string {
  if (!papers || papers.length === 0) return "";
  const sorted = [...papers].sort().join("|");
  const preset = FOCUS_PRESETS.find((p) => [...p.papers].sort().join("|") === sorted);
  if (preset) return `preset:${preset.key}`;
  if (papers.length === 1) return `paper:${papers[0]}`;
  return "custom";
}

function papersFor(value: string, current: string[] | null): string[] | null {
  if (value === "") return null;
  if (value === "custom") return current;
  if (value.startsWith("preset:")) {
    return FOCUS_PRESETS.find((p) => `preset:${p.key}` === value)?.papers ?? null;
  }
  return [value.slice("paper:".length)];
}

/**
 * The personal timetable editor: hours and subject focus for each weekday,
 * block start times and per-paper emphasis. Saving replans immediately.
 */
export function TimetableView({ settings }: { settings: PlannerSettings }) {
  const patchPlanner = useAppStore((state) => state.patchPlanner);
  const [draft, setDraft] = React.useState<PlannerSettings>(settings);
  const [saved, setSaved] = React.useState(false);

  // Resync the draft when the saved settings change (adjust-during-render).
  const [synced, setSynced] = React.useState(settings);
  if (synced !== settings) {
    setSynced(settings);
    setDraft(settings);
  }

  const dirty = JSON.stringify(draft) !== JSON.stringify(settings);
  const update = (patch: Partial<PlannerSettings>) => {
    setSaved(false);
    setDraft((current) => ({ ...current, ...patch }));
  };

  const setHours = (weekday: number, value: number | null) => {
    const weekdayHours = [...draft.weekdayHours];
    weekdayHours[weekday] = value;
    update({ weekdayHours });
  };
  const setFocus = (weekday: number, papers: string[] | null) => {
    const dayFocus = [...draft.dayFocus];
    dayFocus[weekday] = papers;
    update({ dayFocus });
  };
  const setWeight = (paperId: string, weight: number) => {
    const paperWeights = { ...draft.paperWeights };
    if (weight === 1) delete paperWeights[paperId];
    else paperWeights[paperId] = weight;
    update({ paperWeights });
  };

  const save = () => {
    patchPlanner({
      weekdayHours: draft.weekdayHours,
      dayFocus: draft.dayFocus,
      studyStartTime: draft.studyStartTime,
      afternoonStartTime: draft.afternoonStartTime,
      eveningStartTime: draft.eveningStartTime,
      paperWeights: draft.paperWeights,
      dailyHours: draft.dailyHours,
      weeklyOffDay: draft.weeklyOffDay,
    });
    setSaved(true);
  };

  const resetTimetable = () =>
    update({
      weekdayHours: [...PLANNER_SETTING_DEFAULTS.weekdayHours],
      dayFocus: [...PLANNER_SETTING_DEFAULTS.dayFocus],
      afternoonStartTime: PLANNER_SETTING_DEFAULTS.afternoonStartTime,
      eveningStartTime: PLANNER_SETTING_DEFAULTS.eveningStartTime,
      paperWeights: {},
    });

  // Preview: the coming Monday-first week with real capacities.
  const today = todayStr();
  const preview = WEEK_ORDER.map((weekday) => {
    let date = today;
    while (weekdayOf(date) !== weekday) date = addDays(date, 1);
    const capacity = dayCapacity(date, draft);
    return { weekday, capacity };
  });
  const weekly = weeklyCapacityMinutes(draft);
  const maxMinutes = Math.max(60, ...preview.map((day) => day.capacity.capacityMinutes));

  return (
    <div className="space-y-6">
      <div className="callout">
        <span aria-hidden className="text-lg leading-6">🕰️</span>
        <div className="text-sm leading-relaxed">
          <p className="font-medium">Make the plan fit your real week.</p>
          <p className="text-muted-foreground">
            Give each weekday its own hours (0 = rest day), dedicate days to a
            subject (e.g. PSIR on Mon/Wed/Fri), set when your blocks start, and
            emphasise the papers that need more time. Due revisions always
            appear, whatever the day&apos;s focus — memory never waits.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Weekly timetable</CardTitle>
          <CardDescription>
            Default day: {draft.dailyHours}h. Leave a day on “Default” to use it.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-y bg-secondary/40 text-xs text-muted-foreground">
                <th className="px-4 py-2 text-left font-medium">Day</th>
                <th className="px-3 py-2 text-left font-medium">Study hours</th>
                <th className="px-3 py-2 text-left font-medium">Subject focus</th>
                <th className="px-4 py-2 text-right font-medium">Planned</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {preview.map(({ weekday, capacity }) => {
                const override = draft.weekdayHours[weekday];
                const offDay = draft.weeklyOffDay === weekday;
                const focus = draft.dayFocus[weekday];
                const value = focusValue(focus);
                return (
                  <tr key={weekday} className={cn(offDay && "bg-secondary/30")}>
                    <td className="px-4 py-2.5 font-medium">
                      {WEEKDAY_NAMES[weekday]}
                      {offDay && <span className="tag tag-gray ml-2">Weekly off</span>}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <NativeSelect
                          aria-label={`${WEEKDAY_NAMES[weekday]} hours`}
                          value={override === null ? "" : String(override)}
                          disabled={offDay}
                          onChange={(e) =>
                            setHours(weekday, e.target.value === "" ? null : Number(e.target.value))
                          }
                          className="h-8 w-36"
                        >
                          <option value="">Default ({draft.dailyHours}h)</option>
                          <option value="0">Rest day (0h)</option>
                          {[1, 1.5, 2, 2.5, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((h) => (
                            <option key={h} value={h}>
                              {h}h
                            </option>
                          ))}
                        </NativeSelect>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <NativeSelect
                        aria-label={`${WEEKDAY_NAMES[weekday]} subject focus`}
                        value={value}
                        disabled={offDay || hoursForWeekday(weekday, draft) <= 0}
                        onChange={(e) => setFocus(weekday, papersFor(e.target.value, focus))}
                        className="h-8 min-w-[15rem]"
                      >
                        <option value="">Balanced — all subjects</option>
                        <optgroup label="Presets">
                          {FOCUS_PRESETS.map((preset) => (
                            <option key={preset.key} value={`preset:${preset.key}`}>
                              {preset.label}
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="One paper">
                          {ALL_PAPERS.map((paper) => (
                            <option key={paper.id} value={`paper:${paper.id}`}>
                              {paperShortName(paper.id)} — {paper.title.split(" — ").pop()}
                            </option>
                          ))}
                        </optgroup>
                        {value === "custom" && <option value="custom">Custom mix</option>}
                      </NativeSelect>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-2">
                        <span className="h-1.5 w-20 overflow-hidden rounded-full bg-secondary">
                          <span
                            className="block h-full rounded-full bg-primary"
                            style={{ width: `${(capacity.capacityMinutes / maxMinutes) * 100}%` }}
                          />
                        </span>
                        <span className="w-12 text-right text-xs tabular-nums text-muted-foreground">
                          {capacity.capacityMinutes === 0
                            ? "rest"
                            : `${Math.round((capacity.capacityMinutes / 60) * 10) / 10}h`}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="border-t px-4 py-3 text-xs text-muted-foreground">
            ≈ {Math.round((weekly / 60) * 10) / 10} study hours a week after your
            planner aggressiveness and session limits ({draft.maxSessionsPerDay} ×{" "}
            {draft.sessionMinutes} min/day max).
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Study blocks</CardTitle>
            <CardDescription>When your morning, afternoon and evening sessions begin.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-3">
            <TimeField
              id="tt-morning"
              label="Morning"
              value={draft.studyStartTime}
              onChange={(studyStartTime) => update({ studyStartTime })}
            />
            <TimeField
              id="tt-afternoon"
              label="Afternoon"
              value={draft.afternoonStartTime}
              onChange={(afternoonStartTime) => update({ afternoonStartTime })}
            />
            <TimeField
              id="tt-evening"
              label="Evening"
              value={draft.eveningStartTime}
              onChange={(eveningStartTime) => update({ eveningStartTime })}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Subject emphasis</CardTitle>
            <CardDescription>
              “High” brings a paper round twice as often in fresh study; “Very
              high” three times.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {ALL_PAPERS.map((paper) => (
              <div key={paper.id} className="flex items-center gap-3">
                <span className="min-w-0 flex-1 truncate text-sm">{paper.title}</span>
                <NativeSelect
                  aria-label={`${paper.title} emphasis`}
                  value={String(draft.paperWeights[paper.id] ?? 1)}
                  onChange={(e) => setWeight(paper.id, Number(e.target.value))}
                  className="h-8 w-32"
                >
                  {PAPER_WEIGHT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </NativeSelect>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="sticky bottom-24 z-20 flex flex-wrap items-center justify-end gap-2 rounded-lg border bg-background/95 p-3 backdrop-blur md:bottom-4">
        {saved && !dirty && (
          <span className="mr-auto flex items-center gap-1.5 text-sm text-success">
            <Check className="h-4 w-4" /> Saved — your plan has been rebuilt.
          </span>
        )}
        {dirty && (
          <span className="mr-auto text-sm text-muted-foreground">Unsaved timetable changes</span>
        )}
        <Button variant="ghost" onClick={resetTimetable}>
          <RotateCcw /> Reset timetable
        </Button>
        <Button variant="outline" disabled={!dirty} onClick={() => setDraft(settings)}>
          Discard
        </Button>
        <Button disabled={!dirty} onClick={save}>
          Save & replan
        </Button>
      </div>
    </div>
  );
}

function TimeField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="time"
        value={value}
        onChange={(e) => e.target.value && onChange(e.target.value)}
      />
    </div>
  );
}
