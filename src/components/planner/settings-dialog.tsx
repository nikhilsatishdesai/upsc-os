"use client";

import * as React from "react";
import { Settings2 } from "lucide-react";

import { useAppStore } from "@/store/app-store";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SetupForm } from "@/components/planner/setup-form";

export function PlannerSettingsDialog() {
  const [open, setOpen] = React.useState(false);
  const examDate = useAppStore((state) => state.examDate);
  const planner = useAppStore((state) => state.planner);
  const configurePlanner = useAppStore((state) => state.configurePlanner);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings2 /> Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Planner settings</DialogTitle>
          <DialogDescription>
            Saving regenerates your upcoming plan. Completed work and tasks
            you moved by hand are preserved.
          </DialogDescription>
        </DialogHeader>
        <SetupForm
          initialPrelimsDate={examDate}
          initialSettings={planner}
          submitLabel="Save and replan"
          onSubmit={({ prelimsDate, settings }) => {
            configurePlanner(prelimsDate, settings);
            setOpen(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
