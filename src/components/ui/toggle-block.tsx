"use client";

import * as React from "react";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

/** A Notion toggle heading: ▸ Title — content revealed on click. */
export function ToggleBlock({
  title,
  description,
  emoji,
  defaultOpen = false,
  children,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  emoji?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <section className={className}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="group flex w-full items-center gap-2 rounded-md px-1 py-1.5 text-left transition-colors hover:bg-secondary/70"
      >
        <ChevronRight
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-90",
          )}
        />
        {emoji && <span aria-hidden>{emoji}</span>}
        <span className="text-xl font-semibold tracking-tight">{title}</span>
        {description && (
          <span className="hidden min-w-0 truncate text-sm text-muted-foreground sm:inline">
            — {description}
          </span>
        )}
      </button>
      {open && <div className="pl-7 pt-3">{children}</div>}
    </section>
  );
}
