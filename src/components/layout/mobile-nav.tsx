"use client";

import * as React from "react";
import Link from "next/link";
import { useCleanPathname } from "@/hooks/use-clean-pathname";
import { ChevronRight, Ellipsis } from "lucide-react";

import { cn } from "@/lib/utils";
import { isActivePath, mobileNavItems } from "@/components/layout/nav-items";
import { usePrefsStore } from "@/store/prefs-store";
import { useMounted } from "@/hooks/use-mounted";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { ExamCountdownMini } from "@/components/layout/exam-countdown-mini";

/** Bottom tab bar: four primary destinations + a "More" sheet. */
export function MobileNav() {
  const pathname = useCleanPathname();
  const [moreOpen, setMoreOpen] = React.useState(false);
  const mounted = useMounted();
  const optional = usePrefsStore((state) => state.optionalSubject);
  const { primary: mobilePrimaryItems, more: mobileMoreItems } = mobileNavItems(
    !mounted || optional === "psir",
  );
  const moreActive = mobileMoreItems.some((item) =>
    isActivePath(pathname, item.href),
  );

  return (
    <>
      <nav
        aria-label="Main navigation"
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/90 backdrop-blur-md supports-[backdrop-filter]:bg-card/75 md:hidden"
      >
        <div
          className="grid grid-cols-5"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          {mobilePrimaryItems.map((item) => {
            const active = isActivePath(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex flex-col items-center gap-1 py-2.5 text-[10.5px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                {active && (
                  <span
                    aria-hidden
                    className="absolute top-0 h-0.5 w-8 rounded-full bg-primary"
                  />
                )}
                <item.icon className="h-5 w-5" />
                <span className="max-w-full truncate px-1">
                  {item.title.replace(" Optional", "")}
                </span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={cn(
              "relative flex flex-col items-center gap-1 py-2.5 text-[10.5px] font-medium transition-colors",
              moreActive ? "text-primary" : "text-muted-foreground",
            )}
          >
            {moreActive && (
              <span
                aria-hidden
                className="absolute top-0 h-0.5 w-8 rounded-full bg-primary"
              />
            )}
            <Ellipsis className="h-5 w-5" />
            More
          </button>
        </div>
      </nav>

      <Dialog open={moreOpen} onOpenChange={setMoreOpen}>
        <DialogContent className="top-auto bottom-0 translate-y-0 rounded-t-2xl rounded-b-none p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] data-[state=open]:slide-in-from-bottom-10 data-[state=closed]:slide-out-to-bottom-10 sm:max-w-lg">
          <DialogTitle className="px-1 text-base">More</DialogTitle>
          <DialogDescription className="sr-only">
            Other sections of UPSC OS
          </DialogDescription>
          <ExamCountdownMini />
          <ul className="divide-y rounded-xl border">
            {mobileMoreItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className="flex items-center gap-3 px-3.5 py-3"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
                    <span aria-hidden className="text-lg leading-none">{item.emoji}</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{item.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {item.description}
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}
