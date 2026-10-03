"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { getBreadcrumbs } from "@/lib/syllabus";
import { cn } from "@/lib/utils";

type Crumb = { label: string; href: string; emoji?: string };

const ROUTES: Record<string, Crumb> = {
  "/dashboard": { label: "Dashboard", href: "/dashboard", emoji: "🏠" },
  "/planner": { label: "Planner", href: "/planner", emoji: "🗓️" },
  "/syllabus": { label: "Syllabus", href: "/syllabus", emoji: "📚" },
  "/psir": { label: "PSIR Optional", href: "/psir", emoji: "🏛️" },
  "/psir/thinkers": { label: "Thinkers vault", href: "/psir/thinkers", emoji: "💬" },
  "/psir/books": { label: "Booklist", href: "/psir/books", emoji: "📖" },
  "/practice": { label: "Answer Writing", href: "/practice", emoji: "✍️" },
  "/chanakya": { label: "Chanakya", href: "/chanakya", emoji: "🧠" },
  "/settings": { label: "Settings", href: "/settings", emoji: "⚙️" },
};

function crumbsFor(pathname: string): Crumb[] {
  const syllabus = pathname.match(/^\/syllabus\/(.+)$/);
  if (syllabus) {
    const nodes = getBreadcrumbs(decodeURIComponent(syllabus[1]));
    return [
      ROUTES["/syllabus"],
      ...nodes.map((node) => ({ label: node.title, href: `/syllabus/${node.id}` })),
    ];
  }
  if (pathname.startsWith("/psir/")) {
    return [ROUTES["/psir"], ROUTES[pathname]].filter(Boolean);
  }
  return ROUTES[pathname] ? [ROUTES[pathname]] : [];
}

/** Notion-style top bar: the page's location as a breadcrumb trail. Long
 * trails collapse their middle so the current page always shows. */
export function TopBar({ children }: { children?: React.ReactNode }) {
  const pathname = usePathname();
  const crumbs = crumbsFor(pathname);
  const collapsed =
    crumbs.length > 4
      ? [crumbs[0], { label: "…", href: crumbs[crumbs.length - 3].href }, ...crumbs.slice(-2)]
      : crumbs;

  return (
    <div className="sticky top-0 z-30 hidden h-11 items-center justify-between gap-4 bg-background/90 px-3 backdrop-blur md:flex">
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center text-sm">
        {collapsed.map((crumb, index) => {
          const last = index === collapsed.length - 1;
          return (
            <React.Fragment key={`${crumb.href}-${index}`}>
              {index > 0 && <span className="px-1 text-muted-foreground/60">/</span>}
              <Link
                href={crumb.href}
                aria-current={last ? "page" : undefined}
                className={cn(
                  "flex min-w-0 items-center gap-1.5 rounded-md px-1.5 py-1 transition-colors hover:bg-secondary",
                  last ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {crumb.emoji && <span aria-hidden className="leading-none">{crumb.emoji}</span>}
                <span className="max-w-[18rem] truncate">{crumb.label}</span>
              </Link>
            </React.Fragment>
          );
        })}
      </nav>
      <div className="flex shrink-0 items-center gap-1">{children}</div>
    </div>
  );
}
