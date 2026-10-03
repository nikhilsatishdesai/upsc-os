import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { ProfileSettings } from "@/components/settings/profile-settings";
import { TargetsSettings } from "@/components/settings/targets-settings";
import { DashboardSettings } from "@/components/settings/dashboard-settings";
import { AppearanceSettings } from "@/components/settings/appearance-settings";
import { AiSettings } from "@/components/settings/ai-settings";
import { DataSettings } from "@/components/settings/data-settings";

export const metadata: Metadata = { title: "Settings" };

const SECTIONS = [
  { href: "#profile", label: "👤 About you" },
  { href: "#targets", label: "🎯 Targets" },
  { href: "#dashboard", label: "🧩 Dashboard" },
];

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        emoji="⚙️"
        title="Settings"
        description={
          <>
            Make UPSC OS yours — profile, optional subject, personal targets,
            dashboard layout, appearance, AI and backups. Your weekly timetable
            (hours and subject per day) lives in{" "}
            <Link href="/planner" className="underline underline-offset-2">
              Planner → Timetable
            </Link>
            .
          </>
        }
      />
      <nav className="flex flex-wrap gap-1.5" aria-label="Settings sections">
        {SECTIONS.map((section) => (
          <a key={section.href} href={section.href} className="tag tag-gray hover:opacity-80">
            {section.label}
          </a>
        ))}
      </nav>
      <div className="max-w-3xl space-y-4">
        <ProfileSettings />
        <TargetsSettings />
        <DashboardSettings />
        <AppearanceSettings />
        <AiSettings />
        <DataSettings />
      </div>
    </div>
  );
}
