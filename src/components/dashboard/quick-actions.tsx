"use client";

import Link from "next/link";

import { usePrefsStore } from "@/store/prefs-store";
import { useMounted } from "@/hooks/use-mounted";

const ACTIONS = [
  { emoji: "✍️", label: "Timed answer", href: "/practice", psir: false },
  { emoji: "🏛️", label: "PSIR centre", href: "/psir", psir: true },
  { emoji: "💬", label: "Thinkers", href: "/psir/thinkers", psir: true },
  { emoji: "🕰️", label: "Timetable", href: "/planner", psir: false },
  { emoji: "🎯", label: "Targets", href: "/settings#targets", psir: false },
  { emoji: "🧠", label: "Ask Chanakya", href: "/chanakya", psir: false },
];

/** One-click jumps to the things a student does every day. */
export function QuickActions() {
  const mounted = useMounted();
  const optional = usePrefsStore((state) => state.optionalSubject);
  const actions = ACTIONS.filter((action) => !action.psir || !mounted || optional === "psir");

  return (
    <section className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
      {actions.map((action) => (
        <Link
          key={action.href}
          href={action.href}
          className="flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-colors hover:bg-secondary/70"
        >
          <span aria-hidden className="text-base leading-none">{action.emoji}</span>
          <span className="truncate font-medium">{action.label}</span>
        </Link>
      ))}
    </section>
  );
}
