"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookMarked, Gauge, PenLine, Quote } from "lucide-react";

import { cn } from "@/lib/utils";

const TABS = [
  { href: "/psir", label: "Overview", icon: Gauge },
  { href: "/psir/thinkers", label: "Thinkers vault", icon: Quote },
  { href: "/psir/books", label: "Booklist", icon: BookMarked },
  { href: "/practice", label: "Answer writing", icon: PenLine },
];

/** Tab bar shared by every PSIR page. */
export function PsirNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="PSIR sections"
      className="-mx-4 overflow-x-auto px-4 scrollbar-none md:mx-0 md:px-0"
    >
      <div className="flex min-w-max gap-1 border-b">
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "-mb-px inline-flex items-center gap-1.5 border-b-2 px-2 pb-2 pt-1 text-sm font-medium transition-colors",
                active
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
