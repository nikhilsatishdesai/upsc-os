"use client";

import * as React from "react";
import {
  Check,
  KeyRound,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";

import {
  AI_CAPABILITIES,
  type AiCapability,
  type AiModelListItem,
  type AiProviderId,
} from "@/lib/ai/types";
import { AI_PROVIDERS } from "@/lib/ai/config";
import {
  summarizeUsage,
  useAiStore,
  usedTokensToday,
} from "@/store/ai-store";
import { useMounted } from "@/hooks/use-mounted";
import { useAiService } from "@/components/ai/use-ai-service";
import { friendlyAiError } from "@/components/ai/ai-error";
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
  const service = useAiService();
  const stored = useAiStore((state) => state.providers[providerId]);
  const setProvider = useAiStore((state) => state.setProvider);
  const setProviderModel = useAiStore((state) => state.setProviderModel);
  const cacheProviderModels = useAiStore((state) => state.cacheProviderModels);
  const removeProvider = useAiStore((state) => state.removeProvider);

  const [key, setKey] = React.useState(stored?.apiKey ?? "");
  // The Model ID text box is the single source of truth for what is sent
  // to the provider. It's a free-form string — any model id works.
  const [model, setModel] = React.useState(stored?.selectedModel ?? "");
  const [saved, setSaved] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const [refreshError, setRefreshError] = React.useState<string | null>(null);
  // Labelled models from the last successful refresh (this session).
  const [fetched, setFetched] = React.useState<AiModelListItem[] | null>(null);
  const [pickerSearch, setPickerSearch] = React.useState("");

  // Reflect external changes (import/reset) by syncing the editor when the
  // stored provider identity changes — the render-time reset pattern React
  // recommends, so no effect and no cascading renders.
  const [prevStored, setPrevStored] = React.useState(stored);
  if (stored !== prevStored) {
    setPrevStored(stored);
    setKey(stored?.apiKey ?? "");
    setModel(stored?.selectedModel ?? "");
    setFetched(null);
  }

  const connected = (stored?.apiKey ?? "") !== "";

  const save = () => {
    if (key.trim() === "") {
      removeProvider(providerId);
    } else {
      setProvider(providerId, { apiKey: key.trim(), selectedModel: model });
    }
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1500);
  };

  const refresh = async () => {
    setRefreshError(null);
    if (key.trim() === "") {
      setRefreshError("Enter an API key first.");
      return;
    }
    // Persist the current key + model so the client fetches with them.
    setProvider(providerId, { apiKey: key.trim(), selectedModel: model });
    setRefreshing(true);
    try {
      const models = await service.listModels(providerId);
      setFetched(models);
      cacheProviderModels(
        providerId,
        models.map((item) => item.id),
      );
      if (models.length === 0) {
        setRefreshError("The provider returned no models. Type an id manually.");
      }
    } catch (caught) {
      // Graceful fallback to manual entry — no crash, no blocking.
      setFetched(null);
      setRefreshError(
        `${friendlyAiError(caught)} You can still type a model id below.`,
      );
    } finally {
      setRefreshing(false);
    }
  };

  const pickModel = (id: string) => {
    setModel(id);
    setPickerSearch("");
    setFetched(null);
    if (connected) {
      setProviderModel(providerId, id);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1500);
    }
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

      {/* API key */}
      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <Input
          type="password"
          autoComplete="off"
          placeholder={`${info.label} API key`}
          value={key}
          onChange={(event) => setKey(event.target.value)}
        />
        <div className="flex gap-2">
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

      {/* Model ID — free-form, provider-agnostic */}
      <div className="mt-3 space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          Model ID
        </label>
        <div className="flex gap-2">
          <Input
            value={model}
            spellCheck={false}
            autoComplete="off"
            placeholder={`e.g. ${info.fallbackModel}`}
            onChange={(event) => setModel(event.target.value)}
            onBlur={() => {
              // Manual entry persists on blur when already connected.
              if (connected && model.trim() !== (stored?.selectedModel ?? "")) {
                setProviderModel(providerId, model.trim());
              }
            }}
          />
          {info.listModelsSupported && (
            <Button
              variant="outline"
              size="sm"
              className="shrink-0"
              disabled={refreshing}
              onClick={refresh}
            >
              <RefreshCw className={refreshing ? "animate-spin" : ""} />
              {refreshing ? "Refreshing…" : "Refresh models"}
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Current Model ID:{" "}
          <span className="font-mono text-foreground">
            {model.trim() || info.fallbackModel}
          </span>
          {model.trim() === "" && " (default)"}
        </p>
        {refreshError && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            {refreshError}
          </p>
        )}
        {fetched && fetched.length > 0 && (
          <ModelPicker
            models={fetched}
            selected={model.trim()}
            search={pickerSearch}
            onSearch={setPickerSearch}
            onPick={pickModel}
          />
        )}
      </div>
    </div>
  );
}

/** Searchable model list shown after a successful refresh. The currently
 * selected model is pinned at the top with a ✓; picking any row fills the
 * Model ID box. Manual entry always overrides. */
function ModelPicker({
  models,
  selected,
  search,
  onSearch,
  onPick,
}: {
  models: AiModelListItem[];
  selected: string;
  search: string;
  onSearch: (value: string) => void;
  onPick: (id: string) => void;
}) {
  const query = search.trim().toLowerCase();
  const filtered = models.filter(
    (model) =>
      query === "" ||
      model.id.toLowerCase().includes(query) ||
      model.label.toLowerCase().includes(query),
  );
  const current = filtered.find((model) => model.id === selected);
  const others = filtered.filter((model) => model.id !== selected);

  return (
    <div className="mt-2 rounded-lg border bg-secondary/20 p-2">
      <div className="relative mb-2">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder={`Search ${models.length} models…`}
          className="h-8 pl-8 text-xs"
        />
      </div>
      <div className="max-h-48 space-y-0.5 overflow-y-auto">
        {current && (
          <>
            <p className="px-1 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Selected
            </p>
            <ModelRow model={current} selected onPick={onPick} />
          </>
        )}
        {others.length > 0 && (
          <>
            <p className="px-1 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {current ? "Other models" : "Models"}
            </p>
            {others.map((model) => (
              <ModelRow key={model.id} model={model} onPick={onPick} />
            ))}
          </>
        )}
        {filtered.length === 0 && (
          <p className="px-1 py-2 text-xs text-muted-foreground">
            No match. Type any model id in the box above — it will still work.
          </p>
        )}
      </div>
    </div>
  );
}

function ModelRow({
  model,
  selected,
  onPick,
}: {
  model: AiModelListItem;
  selected?: boolean;
  onPick: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onPick(model.id)}
      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-secondary"
    >
      {selected ? (
        <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
      ) : (
        <span className="w-3.5 shrink-0" />
      )}
      <span className="min-w-0 flex-1 truncate">
        <span className="font-mono">{model.id}</span>
        {model.label !== model.id && (
          <span className="ml-2 text-muted-foreground">{model.label}</span>
        )}
      </span>
    </button>
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
