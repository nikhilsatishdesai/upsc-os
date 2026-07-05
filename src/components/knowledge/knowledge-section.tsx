"use client";

import * as React from "react";
import { ChevronDown, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

/** Collapsible workspace section — keeps topic pages calm. */
export function KnowledgeSection({
  title,
  icon: Icon,
  count,
  defaultOpen = false,
  children,
}: {
  title: string;
  icon: LucideIcon;
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <Card>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 px-5 py-3.5 text-left"
      >
        <Icon className="h-4 w-4 shrink-0 text-primary" />
        <span className="flex-1 text-sm font-semibold">{title}</span>
        {typeof count === "number" && count > 0 && (
          <span className="rounded-full bg-secondary px-2 py-0.5 text-xs tabular-nums text-muted-foreground">
            {count}
          </span>
        )}
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open && <CardContent className="pt-0">{children}</CardContent>}
    </Card>
  );
}
