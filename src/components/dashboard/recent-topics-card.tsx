"use client";

import Link from "next/link";
import { History, ChevronRight } from "lucide-react";

import { getNode } from "@/lib/syllabus";
import { STATUS_META } from "@/lib/status";
import { useAppStore } from "@/store/app-store";
import { useMounted } from "@/hooks/use-mounted";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function RecentTopicsCard() {
  const mounted = useMounted();
  const recentTopics = useAppStore((state) => state.recentTopics);
  const progress = useAppStore((state) => state.progress);

  const items = mounted
    ? recentTopics
        .map((id) => getNode(id))
        .filter((node): node is NonNullable<typeof node> => !!node)
        .slice(0, 5)
    : [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <History className="h-4 w-4" /> Continue where you left off
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Topics you open will appear here.{" "}
            <Link href="/syllabus" className="text-primary hover:underline">
              Browse the syllabus
            </Link>{" "}
            to get started.
          </p>
        ) : (
          <ul className="-mx-2 divide-y divide-border/60">
            {items.map((node) => {
              const status = progress[node.id] ?? "not-started";
              return (
                <li key={node.id}>
                  <Link
                    href={`/syllabus/${node.id}`}
                    className="flex items-center gap-3 rounded-md px-2 py-2.5 transition-colors hover:bg-secondary/50"
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "h-2 w-2 shrink-0 rounded-full",
                        STATUS_META[status].dot,
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">
                        {node.title}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {node.pathTitles.join(" · ")}
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
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
