"use client";

import { useAppStore } from "@/store/app-store";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SetupForm } from "@/components/planner/setup-form";

/** First-time planner setup. Generates the initial plan on submit. */
export function SetupWizard() {
  const examDate = useAppStore((state) => state.examDate);
  const configurePlanner = useAppStore((state) => state.configurePlanner);

  return (
    <div className="max-w-2xl space-y-6">
      <div className="space-y-3">
        <div aria-hidden className="select-none text-[52px] leading-none">🗓️</div>
        <h1 className="text-[30px] font-bold leading-tight tracking-tight md:text-[40px]">
          Build your study plan
        </h1>
        <p className="max-w-xl text-[15px] leading-relaxed text-muted-foreground">
          A few questions about your exam dates and routine. The planner then
          schedules every remaining topic — PSIR included — with spaced
          revisions and rest days, and adapts as life happens. You can shape
          each weekday afterwards in the <strong>Timetable</strong> tab.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Your study rhythm</CardTitle>
          <CardDescription>
            Everything here can be changed later from Planner settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SetupForm
            initialPrelimsDate={examDate}
            submitLabel="Generate my study plan"
            onSubmit={({ prelimsDate, settings }) =>
              configurePlanner(prelimsDate, settings)
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
