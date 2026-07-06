"use client";

import * as React from "react";
import { Check, Wand2, X } from "lucide-react";

import { describeAiAction, type AiAction } from "@/lib/ai/actions";
import { Button } from "@/components/ui/button";

/**
 * Renders AI-proposed actions with explicit confirmation. The AI never
 * mutates state on its own — the user applies or dismisses here, and the
 * decision is recorded in the mentor's memory (learning signal).
 */
export function ActionProposals({
  actions,
  onApply,
  onDismiss,
}: {
  actions: AiAction[];
  onApply: (actions: AiAction[]) => void;
  onDismiss: (actions: AiAction[]) => void;
}) {
  const [resolved, setResolved] = React.useState<"applied" | "dismissed" | null>(
    null,
  );
  if (actions.length === 0) return null;

  if (resolved) {
    return (
      <p className="mt-2 text-xs text-muted-foreground">
        {resolved === "applied"
          ? "✓ Applied — the change is live across UPSC OS."
          : "Dismissed. Chanakya will remember you passed on this."}
      </p>
    );
  }

  return (
    <div className="mt-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-primary">
        <Wand2 className="h-3.5 w-3.5" />
        Chanakya can do{" "}
        {actions.length === 1 ? "this" : `these ${actions.length} things`} for
        you
      </p>
      <ul className="mb-3 space-y-1">
        {actions.map((action, index) => (
          <li key={index} className="text-sm text-foreground">
            • {describeAiAction(action)}
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() => {
            onApply(actions);
            setResolved("applied");
          }}
        >
          <Check /> Apply
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            onDismiss(actions);
            setResolved("dismissed");
          }}
        >
          <X /> Dismiss
        </Button>
      </div>
    </div>
  );
}
