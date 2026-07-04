"use client";

import { useAppStore } from "@/store/app-store";
import { useMounted } from "@/hooks/use-mounted";

function timeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return "Burning the midnight oil";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function Greeting() {
  const mounted = useMounted();
  const displayName = useAppStore((state) => state.displayName);

  const salutation = mounted ? timeGreeting() : "Welcome";
  const name = mounted && displayName ? `, ${displayName}` : "";

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">
        {salutation}
        {name}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Your preparation at a glance.
      </p>
    </div>
  );
}
