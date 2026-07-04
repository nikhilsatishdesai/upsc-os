import { PLANNER_CONFIG, SLOT_ORDER } from "./config";
import { weekdayOf } from "./dates";
import type { PlannerSettings, TaskSlot } from "./types";

export type DayCapacity = {
  date: string;
  isOffDay: boolean;
  /** Minutes of study the day can hold. */
  capacityMinutes: number;
  /** Number of sessions the day can hold. */
  sessions: number;
};

export function dayCapacity(
  date: string,
  settings: PlannerSettings,
): DayCapacity {
  const isOffDay =
    settings.weeklyOffDay >= 0 && weekdayOf(date) === settings.weeklyOffDay;
  if (isOffDay) {
    return { date, isOffDay, capacityMinutes: 0, sessions: 0 };
  }
  const capacityMinutes = Math.min(
    Math.round(settings.dailyHours * 60),
    settings.maxSessionsPerDay * settings.sessionMinutes,
  );
  const sessions =
    capacityMinutes <= 0
      ? 0
      : Math.max(
          1,
          Math.min(
            settings.maxSessionsPerDay,
            Math.floor(capacityMinutes / settings.sessionMinutes),
          ),
        );
  return { date, isOffDay, capacityMinutes, sessions };
}

/** Which slot the i-th session of the day belongs to. */
export function slotForSession(index: number, totalSessions: number): TaskSlot {
  if (totalSessions <= SLOT_ORDER.length) {
    return SLOT_ORDER[Math.min(index, SLOT_ORDER.length - 1)];
  }
  return SLOT_ORDER[Math.min(2, Math.floor((index * 3) / totalSessions))];
}

/** Display start time for a slot ("HH:MM"). */
export function slotStartTime(
  slot: TaskSlot,
  settings: PlannerSettings,
): string {
  if (slot === "morning") return settings.studyStartTime;
  return PLANNER_CONFIG.slotStarts[slot] ?? settings.studyStartTime;
}

/** Study days per week: one recovery day always exists — either the user's
 * weekly off day or the auto-inserted one (burnout prevention). */
export function studyDaysPerWeek(settings: PlannerSettings): number {
  if (settings.weeklyOffDay >= 0) return 6;
  const cycle = PLANNER_CONFIG.maxConsecutiveStudyDays + 1;
  return Math.round((7 * PLANNER_CONFIG.maxConsecutiveStudyDays) / cycle);
}

/** Minutes of study capacity in a typical week. */
export function weeklyCapacityMinutes(settings: PlannerSettings): number {
  const perDay = Math.min(
    Math.round(settings.dailyHours * 60),
    settings.maxSessionsPerDay * settings.sessionMinutes,
  );
  return perDay * studyDaysPerWeek(settings);
}
