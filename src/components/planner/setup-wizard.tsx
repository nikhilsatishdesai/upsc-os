"use client";

import { CalendarCheck2 } from "lucide-react";

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
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
          <CalendarCheck2 className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Set up your study planner
        </h1>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
          Eight quick questions. The planner then builds an adaptive,
          day-by-day study plan from whatever is left of the syllabus — and
          keeps it realistic as life happens.
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
