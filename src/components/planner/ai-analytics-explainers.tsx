"use client";

import * as React from "react";
import { RefreshCw, Sparkles } from "lucide-react";

import type { AnalyticsSubject } from "@/lib/ai/prompts";
import { aiConfigured, useAiStore } from "@/store/ai-store";
import { useMounted } from "@/hooks/use-mounted";
import { useAiService } from "@/components/ai/use-ai-service";
import { friendlyAiError } from "@/components/ai/ai-error";
import { AiMarkdown } from "@/components/ai/ai-markdown";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const SUBJECTS: { subject: AnalyticsSubject; label: string }[] = [
  { subject: "burnout", label: "Explain burnout" },
  { subject: "forecast", label: "Explain forecast" },
  { subject: "readiness", label: "Explain readiness" },
];

/** Analytics-tab AI explainers: Chanakya translates the deterministic
 * numbers (burnout, forecast, readiness) into plain, actionable words. */
export function AiAnalyticsExplainers() {
  const mounted = useMounted();
  const service = useAiService();
  const configured = useAiStore((state) => aiConfigured(state.providers));

  const [active, setActive] = React.useState<AnalyticsSubject | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [text, setText] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  if (!mounted || !configured) return null;

  const explain = (subject: AnalyticsSubject) => {
    setActive(subject);
    setBusy(true);
    setText("");
    setError(null);
    service
      .explainAnalytics(subject)
      .then((output) => setText(output))
      .catch((caught) => setError(friendlyAiError(caught)))
      .finally(() => setBusy(false));
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Sparkles className="h-4 w-4 text-primary" /> Ask Chanakya about these
          numbers
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {SUBJECTS.map(({ subject, label }) => (
            <Button
              key={subject}
              variant={active === subject ? "default" : "outline"}
              size="sm"
              disabled={busy}
              onClick={() => explain(subject)}
            >
              {label}
            </Button>
          ))}
        </div>
        {active && (
          <div className="rounded-lg border bg-secondary/20 p-3">
            {busy ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin" /> Reading your
                analytics…
              </p>
            ) : error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : (
              <AiMarkdown content={text} />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
