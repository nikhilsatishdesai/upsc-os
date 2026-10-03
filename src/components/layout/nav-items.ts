import {
  CalendarCheck2,
  Landmark,
  LayoutDashboard,
  Library,
  PenLine,
  Settings,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  /** Notion-style page icon. */
  emoji: string;
  /** One-line purpose — shown in the mobile "More" sheet and search. */
  description: string;
};

export type NavGroup = { label: string; items: NavItem[] };

const dashboard: NavItem = {
  title: "Dashboard",
  emoji: "🏠",
  href: "/dashboard",
  icon: LayoutDashboard,
  description: "Today at a glance — next session, countdown, progress",
};
const planner: NavItem = {
  title: "Planner",
  emoji: "🗓️",
  href: "/planner",
  icon: CalendarCheck2,
  description: "Your adaptive day-by-day study plan",
};
const syllabus: NavItem = {
  title: "Syllabus",
  emoji: "📚",
  href: "/syllabus",
  icon: Library,
  description: "Every topic of Prelims, Mains and PSIR",
};
const psir: NavItem = {
  title: "PSIR Optional",
  emoji: "🏛️",
  href: "/psir",
  icon: Landmark,
  description: "Paper I & II command centre, thinkers, booklist",
};
const practice: NavItem = {
  title: "Answer Writing",
  emoji: "✍️",
  href: "/practice",
  icon: PenLine,
  description: "Timed answers, self-evaluation and AI review",
};
const chanakya: NavItem = {
  title: "Chanakya",
  emoji: "🧠",
  href: "/chanakya",
  icon: Sparkles,
  description: "Your AI mentor who sees your whole preparation",
};
export const settingsItem: NavItem = {
  title: "Settings",
  emoji: "⚙️",
  href: "/settings",
  icon: Settings,
  description: "Profile, appearance, AI keys and backups",
};

/** Sidebar structure (desktop). */
export const navGroups: NavGroup[] = [
  { label: "Daily", items: [dashboard, planner] },
  { label: "Study", items: [syllabus, psir, practice] },
  { label: "Mentor", items: [chanakya] },
];

/** Every destination, flat — the single nav source for search. */
export const navItems: NavItem[] = [
  ...navGroups.flatMap((group) => group.items),
  settingsItem,
];

/** Mobile bottom bar: four primary tabs + "More" (PSIR swaps for Answer
 * Writing when the student has another optional). */
export function mobileNavItems(showPsir: boolean): {
  primary: NavItem[];
  more: NavItem[];
} {
  return showPsir
    ? { primary: [dashboard, planner, syllabus, psir], more: [practice, chanakya, settingsItem] }
    : { primary: [dashboard, planner, syllabus, practice], more: [chanakya, settingsItem] };
}

export function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + "/");
}
