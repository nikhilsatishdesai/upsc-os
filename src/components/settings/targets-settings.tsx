"use client";

import * as React from "react";
import { Plus, X } from "lucide-react";

import { getStages, getNode } from "@/lib/syllabus";
import { formatDateLong, todayStr } from "@/lib/planner/dates";
import { WEEKLY_TARGET_META, type WeeklyTargets } from "@/lib/targets";
import { usePrefsStore } from "@/store/prefs-store";
import { useMounted } from "@/hooks/use-mounted";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";

const PAPERS = getStages().flatMap(({ papers }) => papers);

/** Personal weekly targets and per-paper first-reading deadlines. */
export function TargetsSettings() {
  const mounted = useMounted();
  const targets = usePrefsStore((state) => state.targets);
  const setTargets = usePrefsStore((state) => state.setTargets);
  const setPaperDeadline = usePrefsStore((state) => state.setPaperDeadline);
  const [paper, setPaper] = React.useState(PAPERS[0]?.id ?? "");
  const [date, setDate] = React.useState("");

  const deadlines = Object.entries(targets.paperDeadlines).sort(([, a], [, b]) => a.localeCompare(b));

  return (
    <Card id="targets">
      <CardHeader>
        <CardTitle className="text-base">🎯 My targets</CardTitle>
        <CardDescription>
          Set the goals you hold yourself to. Leave a box empty to switch that
          target off. Progress shows on your dashboard every week (Monday–Sunday).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!mounted ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              {(Object.keys(WEEKLY_TARGET_META) as (keyof WeeklyTargets)[]).map((key) => {
                const meta = WEEKLY_TARGET_META[key];
                return (
                  <div key={key} className="space-y-1.5">
                    <Label htmlFor={`target-${key}`}>{meta.label} per week</Label>
                    <Input
                      id={`target-${key}`}
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={meta.max}
                      step={meta.step}
                      placeholder="Off"
                      value={targets[key] ?? ""}
                      onChange={(e) => {
                        const value = e.target.value === "" ? null : Number(e.target.value);
                        setTargets({
                          [key]:
                            value === null || !Number.isFinite(value) || value <= 0
                              ? null
                              : Math.min(meta.max, Math.round(value)),
                        });
                      }}
                    />
                    <p className="text-xs text-muted-foreground">{meta.hint}</p>
                  </div>
                );
              })}
            </div>

            <div className="space-y-3 border-t pt-5">
              <div>
                <p className="text-sm font-medium">First-reading deadlines</p>
                <p className="text-xs text-muted-foreground">
                  “Finish PSIR Paper I by 31 December” — the dashboard shows the
                  topics-per-week you need and whether your recent pace is on track.
                </p>
              </div>
              {deadlines.length > 0 && (
                <ul className="divide-y rounded-lg border">
                  {deadlines.map(([paperId, deadline]) => (
                    <li key={paperId} className="flex items-center gap-3 px-3 py-2 text-sm">
                      <span className="min-w-0 flex-1 truncate">{getNode(paperId)?.title}</span>
                      <span className="tag tag-blue">{formatDateLong(deadline)}</span>
                      <button
                        type="button"
                        onClick={() => setPaperDeadline(paperId, null)}
                        aria-label={`Remove deadline for ${getNode(paperId)?.title}`}
                        className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-[14rem] flex-1 space-y-1.5">
                  <Label htmlFor="deadline-paper">Paper</Label>
                  <NativeSelect id="deadline-paper" value={paper} onChange={(e) => setPaper(e.target.value)}>
                    {PAPERS.map((node) => (
                      <option key={node.id} value={node.id}>
                        {node.title}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="deadline-date">Finish by</Label>
                  <Input
                    id="deadline-date"
                    type="date"
                    min={todayStr()}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-44"
                  />
                </div>
                <Button
                  variant="outline"
                  disabled={!paper || !date}
                  onClick={() => {
                    setPaperDeadline(paper, date);
                    setDate("");
                  }}
                >
                  <Plus /> Add deadline
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
