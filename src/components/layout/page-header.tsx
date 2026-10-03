import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export type PageCover = "dawn" | "ocean" | "sage" | "parchment";

const COVER_CLASS: Record<PageCover, string> = {
  dawn: "cover-dawn",
  ocean: "cover-ocean",
  sage: "cover-sage",
  parchment: "cover-parchment",
};

/**
 * Notion-style page header: optional cover banner, a large emoji page
 * icon, a big title, a muted description and actions underneath.
 */
export function PageHeader({
  title,
  description,
  eyebrow,
  emoji,
  icon: Icon,
  cover,
  actions,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  eyebrow?: React.ReactNode;
  /** Page icon (Notion style). */
  emoji?: string;
  /** Fallback icon when no emoji is given. */
  icon?: LucideIcon;
  cover?: PageCover;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("space-y-3", className)}>
      {cover && (
        <div
          aria-hidden
          className={cn("h-28 rounded-lg md:h-40", COVER_CLASS[cover])}
        />
      )}
      <div className={cn(cover && "px-1 md:px-4")}>
        {emoji ? (
          <div
            aria-hidden
            className={cn(
              "mb-2 select-none text-[52px] leading-none md:text-[64px]",
              cover && "-mt-12 md:-mt-14",
            )}
          >
            {emoji}
          </div>
        ) : (
          Icon && (
            <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-secondary text-foreground">
              <Icon className="h-5 w-5" />
            </span>
          )
        )}
        {eyebrow && (
          <div className="mb-1 text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
            {eyebrow}
          </div>
        )}
        <h1 className="text-[30px] font-bold leading-[1.15] tracking-tight text-balance md:text-[40px]">
          {title}
        </h1>
        {description && (
          <div className="mt-2 max-w-3xl text-[15px] leading-relaxed text-muted-foreground">
            {description}
          </div>
        )}
        {actions && (
          <div className="mt-4 flex flex-wrap items-center gap-2">{actions}</div>
        )}
      </div>
    </header>
  );
}

/** Notion H2-style section heading with an optional right-side action. */
export function SectionHeading({
  title,
  description,
  action,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-2", className)}>
      <div className="min-w-0">
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        {description && (
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
