"use client";

import { DASHBOARD_CARDS, usePrefsStore } from "@/store/prefs-store";
import { useMounted } from "@/hooks/use-mounted";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Choose which blocks appear on the dashboard. */
export function DashboardSettings() {
  const mounted = useMounted();
  const hidden = usePrefsStore((state) => state.hiddenCards);
  const setHidden = usePrefsStore((state) => state.setCardHidden);
  const dismissed = usePrefsStore((state) => state.onboardingDismissed);
  const setDismissed = usePrefsStore((state) => state.setOnboardingDismissed);

  return (
    <Card id="dashboard">
      <CardHeader>
        <CardTitle className="text-base">🧩 Dashboard layout</CardTitle>
        <CardDescription>Show only the blocks you actually use.</CardDescription>
      </CardHeader>
      <CardContent>
        {!mounted ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
            {DASHBOARD_CARDS.map((card) => (
              <Switch
                key={card.id}
                label={card.label}
                checked={!hidden.includes(card.id)}
                onChange={(checked) => setHidden(card.id, !checked)}
              />
            ))}
            <Switch
              label="Getting-started checklist"
              checked={!dismissed}
              onChange={(checked) => setDismissed(!checked)}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Switch({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-md px-1 py-1.5 text-sm hover:bg-secondary/60">
      {label}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-5 w-9 shrink-0 rounded-full transition-colors",
          checked ? "bg-primary" : "bg-input",
        )}
      >
        <span
          className={cn(
            "absolute left-0 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-[18px]" : "translate-x-0.5",
          )}
        />
      </button>
    </label>
  );
}
