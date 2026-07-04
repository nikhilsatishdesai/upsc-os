"use client";

import Link from "next/link";
import { CalendarDays, ArrowRight } from "lucide-react";

import { diffDays, formatDateLong, todayStr } from "@/lib/planner/dates";
import { useAppStore } from "@/store/app-store";
import { useMounted } from "@/hooks/use-mounted";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function CountdownCard() {
  const mounted = useMounted();
  const examDate = useAppStore((state) => state.examDate);
  const mainsDate = useAppStore((state) => state.planner?.mainsDate ?? "");

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <CalendarDays className="h-4 w-4" /> Exam countdown
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!mounted ? (
          <Skeleton className="h-14 w-40" />
        ) : examDate === "" && mainsDate === "" ? (
          <div>
            <p className="text-sm text-muted-foreground">
              Set your target exam dates to see the countdown.
            </p>
            <Link
              href="/planner"
              className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              Set up the planner <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : (
          <div className="space-y-2.5">
            {examDate && <CountdownRow label="Prelims" date={examDate} />}
            {mainsDate && <CountdownRow label="Mains" date={mainsDate} />}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CountdownRow({ label, date }: { label: string; date: string }) {
  const days = diffDays(todayStr(), date);

  return (
    <div className="flex items-baseline justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="truncate text-xs text-muted-foreground">
          {formatDateLong(date)}
        </p>
      </div>
      <p className="shrink-0 text-2xl font-semibold tabular-nums tracking-tight">
        {days < 0 ? (
          <span className="text-base text-muted-foreground">passed</span>
        ) : days === 0 ? (
          "Today"
        ) : (
          <>
            {days}
            <span className="ml-1 text-sm font-normal text-muted-foreground">
              days
            </span>
          </>
        )}
      </p>
    </div>
  );
}
