"use client";

import * as React from "react";
import { Cpu } from "lucide-react";

import { AI_PROVIDERS } from "@/lib/ai/config";
import type { AiCapability } from "@/lib/ai/types";
import { aiClientConfig, useAiStore } from "@/store/ai-store";
import { createAiClient } from "@/lib/ai/client";
import { Badge } from "@/components/ui/badge";

/** Small badge naming the provider+model that will serve a capability —
 * so the UI stays honest about which engine is answering, without the
 * rest of the app ever knowing. */
export function ProviderIndicator({
  capability = "chat",
}: {
  capability?: AiCapability;
}) {
  const providers = useAiStore((state) => state.providers);
  const order = useAiStore((state) => state.order);
  const routing = useAiStore((state) => state.routing);
  const budget = useAiStore((state) => state.dailyBudgetTokens);

  const resolved = React.useMemo(() => {
    const client = createAiClient({
      getConfig: () =>
        aiClientConfig({ providers, order, routing, dailyBudgetTokens: budget }),
    });
    return client.resolveChain(capability)[0] ?? null;
  }, [providers, order, routing, budget, capability]);

  if (!resolved) return null;
  const label = AI_PROVIDERS[resolved.provider].label.split(" ")[0];

  // The exact model id currently configured — no lookup table, so any
  // future model shows correctly.
  return (
    <Badge variant="outline" className="gap-1.5 text-muted-foreground">
      <Cpu className="h-3 w-3" />
      {label} · {resolved.model}
    </Badge>
  );
}
