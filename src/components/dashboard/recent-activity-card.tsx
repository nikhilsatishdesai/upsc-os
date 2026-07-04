"use client";

import * as React from "react";
import Link from "next/link";
import { Activity } from "lucide-react";

import { formatDayShort } from "@/lib/planner/dates";
import { getNode } from "@/lib/syllabus";
import { useAppStore } from "@/store/app-store";
import { useMounted } from "@/hooks/use-mounted";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const MAX_ITEMS = 5;

/** The user's latest completed study sessions. */
export function RecentActivityCard() {
  const mounted = useMounted();
  const tasksMap = useAppStore((state) => state.tasks);

  const items = React.useMemo(() => {
    if (!mounted) return [];
    return Object.values(tasksMap)
      .filter((task) => task.status === "completed" && task.completedAt)
      .sort((a, b) => (b.completedAt! < a.completedAt! ? -1 : 1))
      .slice(0, MAX_ITEMS);
  }, [tasksMap, mounted]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Activity className="h-4 w-4" /> Recent activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Completed study sessions will appear here.
          </p>
        ) : (
          <ul className="-mx-2 divide-y divide-border/60">
            {items.map((task) => {
              const node = getNode(task.topicId);
              if (!node) return null;
              return (
                <li key={task.id}>
                  <Link
                    href={`/syllabus/${task.topicId}`}
                    className="flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-secondary/50"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">
                        Studied {node.title}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {task.minutes} min ·{" "}
                        {formatDayShort(task.completedAt!.slice(0, 10))}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
