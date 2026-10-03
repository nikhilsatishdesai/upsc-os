"use client";

import * as React from "react";
import { ChevronRight, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/** A Notion-style toggle block — keeps topic pages calm and scannable. */
export function KnowledgeSection({
  title,
  icon: Icon,
  description,
  count,
  defaultOpen = false,
  children,
}: {
  title: string;
  icon: LucideIcon;
  /** One-line purpose shown beside the title. */
  description?: string;
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <section>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="group flex w-full items-center gap-2 rounded-md px-1 py-1.5 text-left transition-colors hover:bg-secondary/70"
      >
        <ChevronRight
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-90",
          )}
        />
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="shrink-0 text-[15px] font-semibold">{title}</span>
        {typeof count === "number" && count > 0 && (
          <span className="tag tag-gray tabular-nums">{count}</span>
        )}
        {description && (
          <span className="hidden min-w-0 truncate text-sm text-muted-foreground sm:inline">
            — {description}
          </span>
        )}
      </button>
      {open && <div className="pb-5 pl-7 pr-1 pt-2">{children}</div>}
    </section>
  );
}
