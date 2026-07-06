"use client";

import { useRouter } from "next/navigation";
import { CalendarOff, Hammer, LifeBuoy, Sparkles, TrendingDown } from "lucide-react";

import { PLANNER_INTENTS, type PlannerIntent } from "@/lib/ai/prompts";
import { aiConfigured, useAiStore } from "@/store/ai-store";
import { useMounted } from "@/hooks/use-mounted";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ITEMS: { intent: PlannerIntent; label: string; icon: typeof Hammer }[] = [
  { intent: "rebuild-schedule", label: "Rebuild schedule", icon: Hammer },
  { intent: "reduce-workload", label: "Reduce workload", icon: TrendingDown },
  { intent: "recover-missed-week", label: "Recover missed week", icon: LifeBuoy },
  { intent: "vacation-mode", label: "Vacation mode", icon: CalendarOff },
];

/** Planner "Ask Chanakya" — hands the current plan context to the mentor
 * for a specific intent. Chanakya proposes actions the deterministic engine
 * then executes; the model never schedules tasks itself. */
export function AskChanakyaMenu() {
  const mounted = useMounted();
  const router = useRouter();
  const configured = useAiStore((state) => aiConfigured(state.providers));

  if (!mounted || !configured) return null;

  const go = (intent: PlannerIntent) =>
    router.push(`/chanakya?ask=${encodeURIComponent(PLANNER_INTENTS[intent])}`);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Sparkles /> Ask Chanakya
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Ask the mentor to help</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {ITEMS.map((item) => (
          <DropdownMenuItem key={item.intent} onSelect={() => go(item.intent)}>
            <item.icon className="mr-2 h-4 w-4" /> {item.label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => router.push("/chanakya")}>
          <Sparkles className="mr-2 h-4 w-4" /> Open Chanakya
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
