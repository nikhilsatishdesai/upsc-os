"use client";

import Link from "next/link";
import { CalendarDays, ArrowRight } from "lucide-react";

import { useAppStore } from "@/store/app-store";
import { useMounted } from "@/hooks/use-mounted";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function daysUntil(dateString: string): number {
  const [year, month, day] = dateString.split("-").map(Number);
  const target = new Date(year, month - 1, day);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export function CountdownCard() {
  const mounted = useMounted();
  const examDate = useAppStore((state) => state.examDate);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <CalendarDays className="h-4 w-4" /> Exam countdown
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!mounted ? (
          <Skeleton className="h-10 w-32" />
        ) : examDate === "" ? (
          <div>
            <p className="text-sm text-muted-foreground">
              Set your target exam date to see the countdown.
            </p>
            <Link
              href="/settings"
              className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              Set exam date <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : (
          <CountdownValue examDate={examDate} />
        )}
      </CardContent>
    </Card>
  );
}

function CountdownValue({ examDate }: { examDate: string }) {
  const days = daysUntil(examDate);
  const formatted = new Date(examDate + "T00:00:00").toLocaleDateString(
    "en-IN",
    { day: "numeric", month: "long", year: "numeric" },
  );

  if (days < 0) {
    return (
      <div>
        <p className="text-3xl font-semibold tracking-tight">Exam over</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {formatted} has passed —{" "}
          <Link href="/settings" className="text-primary hover:underline">
            set your next target
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-3xl font-semibold tabular-nums tracking-tight">
        {days === 0 ? "Today" : `${days} day${days === 1 ? "" : "s"}`}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">until {formatted}</p>
    </div>
  );
}
