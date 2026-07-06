import type { Metadata } from "next";

import { ProfileSettings } from "@/components/settings/profile-settings";
import { AppearanceSettings } from "@/components/settings/appearance-settings";
import { AiSettings } from "@/components/settings/ai-settings";
import { DataSettings } from "@/components/settings/data-settings";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Profile, appearance, AI providers and data management.
        </p>
      </div>
      <div className="max-w-2xl space-y-4">
        <ProfileSettings />
        <AppearanceSettings />
        <AiSettings />
        <DataSettings />
      </div>
    </div>
  );
}
