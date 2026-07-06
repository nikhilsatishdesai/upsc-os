"use client";

import * as React from "react";
import Link from "next/link";
import { RefreshCw, Sparkles } from "lucide-react";

import { aiConfigured, useAiStore } from "@/store/ai-store";
import { useAppStore } from "@/store/app-store";
import { useMounted } from "@/hooks/use-mounted";
import { useAiService } from "@/components/ai/use-ai-service";
import { friendlyAiError } from "@/components/ai/ai-error";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Dashboard "Daily Briefing" — one grounded paragraph from Chanakya each
 * morning (today's mission, why it matters, one nudge). Cached per day, so
 * it costs at most one call daily. Degrades to a gentle connect prompt when
 * no AI provider is configured.
 */
export function DailyBriefingCard() {
  const mounted = useMounted();
  const service = useAiService();
  const configured = useAiStore((state) => aiConfigured(state.providers));
  const hasPlanner = useAppStore((state) => state.planner !== null);

  const [text, setText] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const requested = React.useRef(false);

  const load = React.useCallback(
    (bypassCache = false) => {
      setBusy(true);
      setError(null);
      service
        .dailyBriefing(bypassCache)
        .then((briefing) => setText(briefing))
        .catch((caught) => setError(friendlyAiError(caught)))
        .finally(() => setBusy(false));
    },
    [service],
  );

  // Auto-load once per mount when it's actually useful (cached per day).
  React.useEffect(() => {
    if (mounted && configured && hasPlanner && !requested.current) {
      requested.current = true;
      load();
    }
  }, [mounted, configured, hasPlanner, load]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between gap-2 text-sm font-medium text-muted-foreground">
          <span className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Daily briefing
          </span>
          {mounted && configured && hasPlanner && (
            <button
              type="button"
              onClick={() => load(true)}
              disabled={busy}
              aria-label="Refresh briefing"
              className="text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
            >
              <RefreshCw className={busy ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            </button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!mounted ? (
          <Skeleton className="h-16 w-full" />
        ) : !configured ? (
          <p className="text-sm text-muted-foreground">
            Connect an AI provider in{" "}
            <Link href="/settings" className="text-primary hover:underline">
              Settings → AI
            </Link>{" "}
            and Chanakya will brief you each morning — today&apos;s mission, why
            it matters, and one nudge.
          </p>
        ) : !hasPlanner ? (
          <p className="text-sm text-muted-foreground">
            Set up the{" "}
            <Link href="/planner" className="text-primary hover:underline">
              planner
            </Link>{" "}
            so Chanakya can brief you on today&apos;s mission.
          </p>
        ) : busy && text === "" ? (
          <Skeleton className="h-16 w-full" />
        ) : error ? (
          <div className="space-y-2">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="ghost" size="sm" onClick={() => load(true)}>
              <RefreshCw /> Try again
            </Button>
          </div>
        ) : (
          <p className="text-sm leading-relaxed">{text}</p>
        )}
      </CardContent>
    </Card>
  );
}
