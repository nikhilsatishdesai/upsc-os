"use client";

import { usePrefsStore, type DashboardCardId } from "@/store/prefs-store";
import { useMounted } from "@/hooks/use-mounted";
import { cn } from "@/lib/utils";

/** Renders a dashboard block unless the student hid it (Settings →
 * Dashboard layout). `requiresPsir` blocks also hide for other optionals. */
export function DashBlock({
  id,
  requiresPsir = false,
  className,
  children,
}: {
  id: DashboardCardId;
  requiresPsir?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const mounted = useMounted();
  const hidden = usePrefsStore((state) => state.hiddenCards.includes(id));
  const optional = usePrefsStore((state) => state.optionalSubject);
  if (mounted && (hidden || (requiresPsir && optional !== "psir"))) return null;
  // min-w-0: grid items must be allowed to shrink, or long truncated
  // lines push the page wider than a phone screen.
  return <div className={cn("min-w-0", className)}>{children}</div>;
}
