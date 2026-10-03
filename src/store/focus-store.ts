import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import {
  pauseSession,
  resumeSession,
  startSession,
  type FocusSession,
} from "@/lib/focus";

/**
 * The active focus session (`upsc-os-focus`). Device-local and transient:
 * persisted only so a reload or navigation doesn't kill a running timer;
 * deliberately NOT part of backups.
 */
type FocusState = {
  session: FocusSession | null;
  start: (
    input: Pick<FocusSession, "taskId" | "topicId" | "label" | "plannedSeconds">,
  ) => void;
  pause: () => void;
  resume: () => void;
  clear: () => void;
};

export const useFocusStore = create<FocusState>()(
  persist(
    (set) => ({
      session: null,
      start: (input) => set({ session: startSession(input, Date.now()) }),
      pause: () =>
        set((state) => ({
          session: state.session ? pauseSession(state.session, Date.now()) : null,
        })),
      resume: () =>
        set((state) => ({
          session: state.session ? resumeSession(state.session, Date.now()) : null,
        })),
      clear: () => set({ session: null }),
    }),
    {
      name: "upsc-os-focus",
      version: 1,
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
