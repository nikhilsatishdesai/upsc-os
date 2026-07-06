"use client";

import * as React from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";

import type { AiAction } from "@/lib/ai/actions";
import { aiConfigured, useAiStore } from "@/store/ai-store";
import { useAppStore } from "@/store/app-store";
import { useMounted } from "@/hooks/use-mounted";
import { useAiService } from "@/components/ai/use-ai-service";
import { friendlyAiError } from "@/components/ai/ai-error";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ChanakyaChat } from "./chanakya-chat";
import { ChanakyaInsights } from "./chanakya-insights";

function deriveTitle(text: string): string {
  const clean = text.trim().replace(/\s+/g, " ");
  return clean.length > 40 ? `${clean.slice(0, 39)}…` : clean;
}

/**
 * The Chanakya command center: a mentor chat that can act, alongside the
 * live command rail (insights, weak topics, burnout, revisions,
 * recommendations, quick actions, recent AI activity). This is the brain
 * of UPSC OS — not a standalone chatbot.
 */
export function ChanakyaWorkspace() {
  const mounted = useMounted();
  const service = useAiService();

  const displayName = useAppStore((state) => state.displayName);
  const configured = useAiStore((state) => aiConfigured(state.providers));
  const conversationsMap = useAiStore((state) => state.conversations);
  const activeId = useAiStore((state) => state.activeConversationId);
  const startConversation = useAiStore((state) => state.startConversation);
  const setActiveConversation = useAiStore((state) => state.setActiveConversation);
  const deleteConversation = useAiStore((state) => state.deleteConversation);

  const [streaming, setStreaming] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const conversations = React.useMemo(
    () =>
      Object.values(conversationsMap).sort((a, b) =>
        b.updatedAt.localeCompare(a.updatedAt),
      ),
    [conversationsMap],
  );
  const activeConversation = activeId ? conversationsMap[activeId] ?? null : null;

  const send = React.useCallback(
    (text: string) => {
      if (busy) return;
      if (!configured) {
        setError("Add an API key in Settings → AI to use Chanakya.");
        return;
      }
      const conversationId =
        activeId ?? startConversation(null, deriveTitle(text));
      setError(null);
      setStreaming("");
      setBusy(true);
      service
        .mentorChat(
          { conversationId, userMessage: text, topicId: null },
          {
            onDelta: (delta) =>
              setStreaming((prev) => (prev ?? "") + delta),
            onError: (aiError) => setError(friendlyAiError(aiError)),
          },
        )
        .catch((caught) => {
          const message = friendlyAiError(caught);
          if (message) setError(message);
        })
        .finally(() => {
          setStreaming(null);
          setBusy(false);
        });
    },
    [busy, configured, activeId, startConversation, service],
  );

  // Deep-link seeding: /chanakya?ask=… auto-sends once (planner "Ask
  // Chanakya", analytics/dashboard prompts). Read from the URL directly so
  // no Suspense boundary is required.
  const seeded = React.useRef(false);
  React.useEffect(() => {
    if (!mounted || seeded.current) return;
    const ask = new URLSearchParams(window.location.search).get("ask");
    if (!ask) return;
    seeded.current = true;
    window.history.replaceState(null, "", "/chanakya");
    // Defer out of the effect body so the send's setState doesn't cascade
    // synchronously with this render.
    if (configured) queueMicrotask(() => send(ask));
  }, [mounted, configured, send]);

  const applyActions = React.useCallback(
    (actions: AiAction[]) => {
      service.executeActions(actions);
    },
    [service],
  );

  const dismissActions = React.useCallback(
    (actions: AiAction[]) => {
      service.rejectActions(actions);
    },
    [service],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Sparkles className="h-6 w-6 text-primary" /> Chanakya
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your UPSC mentor, planner and strategist{displayName ? `, ${displayName}` : ""} —
            he sees everything you&apos;ve built and can act on it.
          </p>
        </div>
      </div>

      {mounted && !configured && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4 text-sm">
            <span>
              Connect an AI provider to bring Chanakya to life. Your key stays
              in this browser.
            </span>
            <Link
              href="/settings"
              className="font-medium text-primary hover:underline"
            >
              Open Settings → AI
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {!mounted ? (
          <Skeleton className="h-[70vh] min-h-[520px] w-full" />
        ) : (
          <ChanakyaChat
            conversation={activeConversation}
            conversations={conversations}
            streaming={streaming}
            busy={busy}
            error={error}
            onSend={send}
            onNewChat={() => setActiveConversation(null)}
            onSelectConversation={setActiveConversation}
            onDeleteConversation={deleteConversation}
            onApplyActions={applyActions}
            onDismissActions={dismissActions}
          />
        )}
        <ChanakyaInsights onAsk={send} />
      </div>
    </div>
  );
}
