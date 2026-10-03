import type { Metadata } from "next";

import { DashboardHero } from "@/components/dashboard/dashboard-hero";
import { NextSessionCard } from "@/components/dashboard/next-session-card";
import { GettingStarted } from "@/components/dashboard/getting-started";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { TargetsCard } from "@/components/dashboard/targets-card";
import { PsirCard } from "@/components/dashboard/psir-card";
import { DashBlock } from "@/components/dashboard/dash-block";
import { TodayPlanCard } from "@/components/dashboard/today-plan-card";
import { InsightsCard } from "@/components/dashboard/insights-card";
import { PapersCard } from "@/components/dashboard/papers-card";
import { RecentActivityCard } from "@/components/dashboard/recent-activity-card";
import { RecentTopicsCard } from "@/components/dashboard/recent-topics-card";
import { KnowledgeCard } from "@/components/dashboard/knowledge-card";
import { DailyBriefingCard } from "@/components/dashboard/daily-briefing-card";

export const metadata: Metadata = { title: "Dashboard" };

/** The home page: what to do now, how the week is going, where you stand.
 * Every block below the fold can be hidden in Settings → Dashboard. */
export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <DashboardHero />
      <NextSessionCard />
      <GettingStarted />

      <DashBlock id="quick-actions">
        <QuickActions />
      </DashBlock>

      <div className="grid gap-4 lg:grid-cols-2">
        <DashBlock id="today">
          <TodayPlanCard />
        </DashBlock>
        <DashBlock id="targets">
          <TargetsCard />
        </DashBlock>
      </div>

      <DashBlock id="briefing">
        <DailyBriefingCard />
      </DashBlock>

      <div className="grid gap-4 lg:grid-cols-2">
        <DashBlock id="psir" requiresPsir>
          <PsirCard />
        </DashBlock>
        <DashBlock id="insights">
          <InsightsCard />
        </DashBlock>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <DashBlock id="papers">
          <PapersCard />
        </DashBlock>
        <DashBlock id="activity">
          <RecentActivityCard />
        </DashBlock>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <DashBlock id="knowledge">
          <KnowledgeCard />
        </DashBlock>
        <DashBlock id="recent">
          <RecentTopicsCard />
        </DashBlock>
      </div>
    </div>
  );
}
