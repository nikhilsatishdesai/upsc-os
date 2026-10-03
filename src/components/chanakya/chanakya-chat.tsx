"use client";

import * as React from "react";
import { Plus, Send, Trash2, User } from "lucide-react";

import { parseAiActions, stripActionBlock, type AiAction } from "@/lib/ai/actions";
import type { AiConversation } from "@/lib/ai/memory";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AiMarkdown } from "@/components/ai/ai-markdown";
import { ActionProposals } from "@/components/ai/action-proposals";
import { ProviderIndicator } from "@/components/ai/provider-indicator";

const STARTERS = [
  "What should I focus on today, and why?",
  "Which of my weak topics is most urgent before Prelims?",
  "Am I on track to finish the syllabus in time?",
  "Plan my next three days around my current backlog.",
];

/**
 * The Chanakya conversation surface: streaming replies rendered as they
 * arrive, conversation history, and inline action proposals. Presentational
 * — all AI orchestration lives in the workspace container.
 */
export function ChanakyaChat({
  conversation,
  conversations,
  streaming,
  busy,
  error,
  onSend,
  onNewChat,
  onSelectConversation,
  onDeleteConversation,
  onApplyActions,
  onDismissActions,
}: {
  conversation: AiConversation | null;
  conversations: AiConversation[];
  streaming: string | null;
  busy: boolean;
  error: string | null;
  onSend: (message: string) => void;
  onNewChat: () => void;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onApplyActions: (actions: AiAction[]) => void;
  onDismissActions: (actions: AiAction[]) => void;
}) {
  const [input, setInput] = React.useState("");
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const messages = conversation?.messages ?? [];

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length, streaming]);

  const submit = () => {
    const text = input.trim();
    if (text === "" || busy) return;
    setInput("");
    onSend(text);
  };

  const lastAssistantIndex = messages.reduce(
    (last, message, index) => (message.role === "assistant" ? index : last),
    -1,
  );

  return (
    <div className="flex h-[70vh] min-h-[520px] min-w-0 flex-col rounded-lg border bg-card">
      {/* Header: conversation switcher + provider indicator */}
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <Button variant="outline" size="sm" onClick={onNewChat} className="shrink-0">
          <Plus /> New chat
        </Button>
        <div className="flex flex-1 gap-1 overflow-x-auto">
          {conversations.slice(0, 8).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectConversation(item.id)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1 text-xs transition-colors",
                item.id === conversation?.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-secondary",
              )}
            >
              {item.title.slice(0, 28)}
            </button>
          ))}
        </div>
        <ProviderIndicator capability="chat" />
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && streaming === null ? (
          <EmptyState onPick={(text) => onSend(text)} disabled={busy} />
        ) : (
          messages.map((message, index) => {
            if (message.role === "user") {
              return (
                <div key={message.id} className="flex justify-end">
                  <div className="flex max-w-[85%] items-start gap-2">
                    <div className="rounded-2xl rounded-tr-sm bg-primary px-3.5 py-2 text-sm text-primary-foreground">
                      {message.content}
                    </div>
                    <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary">
                      <User className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              );
            }
            const display = stripActionBlock(message.content);
            const actions = parseAiActions(message.content).actions;
            return (
              <div key={message.id} className="max-w-[92%]">
                <AiMarkdown content={display} />
                {index === lastAssistantIndex && (
                  <ActionProposals
                    key={message.id}
                    actions={actions}
                    onApply={onApplyActions}
                    onDismiss={onDismissActions}
                  />
                )}
              </div>
            );
          })
        )}
        {streaming !== null && (
          <div className="max-w-[92%]">
            <AiMarkdown content={stripActionBlock(streaming)} />
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="border-t p-3">
        {error && (
          <p role="alert" className="mb-2 text-xs text-destructive">
            {error}
          </p>
        )}
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submit();
              }
            }}
            rows={1}
            placeholder="Ask Chanakya about your preparation…"
            className="max-h-32 min-h-[38px] flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          {conversation && conversations.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Delete this conversation"
              onClick={() => onDeleteConversation(conversation.id)}
              disabled={busy}
            >
              <Trash2 className="text-muted-foreground" />
            </Button>
          )}
          <Button onClick={submit} disabled={busy || input.trim() === ""} size="icon">
            <Send />
          </Button>
        </div>
      </div>
    </div>
  );
}

function EmptyState({
  onPick,
  disabled,
}: {
  onPick: (text: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
      <div className="max-w-md">
        <p className="text-sm font-medium">Ask me anything about your prep.</p>
        <p className="mt-1 text-xs text-muted-foreground">
          I can see your syllabus, planner, analytics, notes, revisions and
          PYQs — no need to paste anything. I&apos;ll explain, advise, and (with
          your OK) make changes across UPSC OS.
        </p>
      </div>
      <div className="grid w-full max-w-md gap-2">
        {STARTERS.map((starter) => (
          <button
            key={starter}
            type="button"
            disabled={disabled}
            onClick={() => onPick(starter)}
            className="rounded-lg border border-border px-3 py-2 text-left text-sm transition-colors hover:bg-secondary disabled:opacity-50"
          >
            {starter}
          </button>
        ))}
      </div>
    </div>
  );
}
