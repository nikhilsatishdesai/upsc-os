"use client";

import * as React from "react";
import { Check, KeyRound, Sparkles, Trash2 } from "lucide-react";

import { AI_CAPABILITIES, type AiCapability, type AiProviderId } from "@/lib/ai/types";
import { AI_PROVIDERS } from "@/lib/ai/config";
import {
  summarizeUsage,
  useAiStore,
  usedTokensToday,
} from "@/store/ai-store";
import { useMounted } from "@/hooks/use-mounted";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";

const PROVIDER_IDS: AiProviderId[] = ["anthropic", "openai", "gemini"];

const CAPABILITY_LABEL: Record<AiCapability, string> = {
  chat: "Mentor chat",
  summary: "Summaries",
  generation: "Flashcards & quizzes",
  reasoning: "Planning & analysis",
  vision: "Vision (future)",
};

/** The AI providers card: keys, models, capability routing, budget, usage.
 * Everything stays on this device — keys are never exported in backups. */
export function AiSettings() {
  const mounted = useMounted();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" /> AI &amp; Chanakya
        </CardTitle>
        <CardDescription>
          Connect an AI provider to unlock Chanakya, your UPSC mentor.
          API keys stay in this browser and are never included in backups.
          Any one provider is enough; add more for capability routing and
          automatic fallback.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!mounted ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <>
            <div className="space-y-4">
              {PROVIDER_IDS.map((id) => (
                <ProviderRow key={id} providerId={id} />
              ))}
            </div>
            <RoutingSection />
            <BudgetSection />
            <UsageSection />
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ProviderRow({ providerId }: { providerId: AiProviderId }) {
  const info = AI_PROVIDERS[providerId];
  const stored = useAiStore((state) => state.providers[providerId]);
  const setProvider = useAiStore((state) => state.setProvider);
  const removeProvider = useAiStore((state) => state.removeProvider);

  const [key, setKey] = React.useState(stored?.apiKey ?? "");
  const [model, setModel] = React.useState(stored?.model ?? info.defaultModel);
  const [saved, setSaved] = React.useState(false);

  // Reflect external changes (import/reset) by syncing the editor when the
  // stored provider identity changes — the render-time reset pattern React
  // recommends, so no effect and no cascading renders.
  const [prevStored, setPrevStored] = React.useState(stored);
  if (stored !== prevStored) {
    setPrevStored(stored);
    setKey(stored?.apiKey ?? "");
    setModel(stored?.model ?? info.defaultModel);
  }

  const connected = (stored?.apiKey ?? "") !== "";

  const save = () => {
    if (key.trim() === "") {
      removeProvider(providerId);
    } else {
      setProvider(providerId, { apiKey: key.trim(), model });
    }
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="rounded-lg border border-border p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-medium">
          <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
          {info.label}
        </span>
        {connected ? (
          <Badge
            variant="outline"
            className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          >
            Connected
          </Badge>
        ) : (
          <Badge variant="outline" className="text-muted-foreground">
            Not connected
          </Badge>
        )}
      </div>
      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <Input
          type="password"
          autoComplete="off"
          placeholder={`${info.label} API key`}
          value={key}
          onChange={(event) => setKey(event.target.value)}
        />
        <div className="flex gap-2">
          <NativeSelect
            value={model}
            onChange={(event) => setModel(event.target.value)}
            className="sm:w-44"
          >
            {info.models.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </NativeSelect>
          <Button onClick={save} size="sm" className="shrink-0">
            {saved ? <Check /> : null}
            {saved ? "Saved" : "Save"}
          </Button>
          {connected && (
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Remove ${info.label}`}
              onClick={() => {
                setKey("");
                removeProvider(providerId);
              }}
            >
              <Trash2 className="text-destructive" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function RoutingSection() {
  const providers = useAiStore((state) => state.providers);
  const routing = useAiStore((state) => state.routing);
  const setRouting = useAiStore((state) => state.setRouting);

  const connected = PROVIDER_IDS.filter(
    (id) => (providers[id]?.apiKey ?? "") !== "",
  );
  if (connected.length < 2) return null;

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Provider routing</p>
      <p className="text-xs text-muted-foreground">
        Choose which provider handles each kind of work. “Auto” follows your
        default order; a provider that fails or is rate-limited falls back to
        the next one automatically.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {AI_CAPABILITIES.filter((capability) => capability !== "vision").map(
          (capability) => (
            <label key={capability} className="flex items-center justify-between gap-2 text-sm">
              <span className="text-muted-foreground">
                {CAPABILITY_LABEL[capability]}
              </span>
              <NativeSelect
                className="w-36"
                value={routing[capability]?.[0] ?? "auto"}
                onChange={(event) => {
                  const value = event.target.value;
                  if (value === "auto") setRouting(capability, null);
                  else
                    setRouting(capability, [
                      value as AiProviderId,
                      ...connected.filter((id) => id !== value),
                    ]);
                }}
              >
                <option value="auto">Auto</option>
                {connected.map((id) => (
                  <option key={id} value={id}>
                    {AI_PROVIDERS[id].label.split(" ")[0]}
                  </option>
                ))}
              </NativeSelect>
            </label>
          ),
        )}
      </div>
    </div>
  );
}

function BudgetSection() {
  const budget = useAiStore((state) => state.dailyBudgetTokens);
  const setDailyBudget = useAiStore((state) => state.setDailyBudget);
  const usage = useAiStore((state) => state.usage);
  const usedToday = usedTokensToday(usage);

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Daily budget</p>
      <p className="text-xs text-muted-foreground">
        A safety ceiling on estimated tokens per day (input + output). AI
        stops for the day when reached and resets at midnight. Set 0 for no
        limit. Used today: {usedToday.toLocaleString("en-IN")} tokens.
      </p>
      <NativeSelect
        className="w-56"
        value={String(budget)}
        onChange={(event) => setDailyBudget(Number(event.target.value))}
      >
        <option value="0">No limit</option>
        <option value="100000">100,000 tokens / day</option>
        <option value="250000">250,000 tokens / day</option>
        <option value="500000">500,000 tokens / day</option>
        <option value="1000000">1,000,000 tokens / day</option>
      </NativeSelect>
    </div>
  );
}

function UsageSection() {
  const usage = useAiStore((state) => state.usage);
  const clearCache = useAiStore((state) => state.clearCache);
  const summary = React.useMemo(() => summarizeUsage(usage), [usage]);

  if (summary.requests === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        No AI usage yet. Once you start using Chanakya, request counts,
        estimated cost and response times appear here.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Usage &amp; cost</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Requests" value={summary.requests.toLocaleString("en-IN")} />
        <Stat
          label="Cache hits"
          value={summary.cacheHits.toLocaleString("en-IN")}
        />
        <Stat label="Failures" value={summary.failures.toLocaleString("en-IN")} />
        <Stat label="Avg response" value={`${summary.averageMs} ms`} />
        <Stat
          label="Input tokens"
          value={summary.inputTokens.toLocaleString("en-IN")}
        />
        <Stat
          label="Output tokens"
          value={summary.outputTokens.toLocaleString("en-IN")}
        />
        <Stat
          label="Est. cost"
          value={`$${summary.estimatedCostUsd.toFixed(3)}`}
        />
      </div>
      <Button variant="ghost" size="sm" onClick={clearCache}>
        Clear response cache
      </Button>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-secondary/40 px-2.5 py-1.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}
