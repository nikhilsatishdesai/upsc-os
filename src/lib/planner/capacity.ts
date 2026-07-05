import { PLANNER_CONFIG, SLOT_ORDER } from "./config";
import { weekdayOf } from "./dates";
import type { PlannerSettings, TaskSlot } from "./types";

export type DayCapacity = {
  date: string;
  isOffDay: boolean;
  /** True when the date falls inside the configured vacation. */
  isVacation: boolean;
  /** Minutes of study the day can hold (after all adjustments). */
  capacityMinutes: number;
  /** Number of sessions the day can hold. */
  sessions: number;
};

export function isVacationDay(
  date: string,
  settings: PlannerSettings,
): boolean {
  return Boolean(
    settings.vacationFrom &&
      settings.vacationTo &&
      date >= settings.vacationFrom &&
      date <= settings.vacationTo,
  );
}

function isWeekend(date: string): boolean {
  const weekday = weekdayOf(date);
  return weekday === 0 || weekday === 6;
}

/**
 * A day's usable study capacity: the base (hours vs sessions×duration,
 * whichever is smaller) scaled by planner aggressiveness, the weekend
 * strategy, and any transient burnout damping (`loadFactor`).
 */
export function dayCapacity(
  date: string,
  settings: PlannerSettings,
  loadFactor: number = 1,
): DayCapacity {
  const isOffDay =
    settings.weeklyOffDay >= 0 && weekdayOf(date) === settings.weeklyOffDay;
  const isVacation = isVacationDay(date, settings);
  if (isOffDay || isVacation) {
    return { date, isOffDay, isVacation, capacityMinutes: 0, sessions: 0 };
  }

  let factor =
    (PLANNER_CONFIG.aggressivenessFactor[settings.aggressiveness] ?? 1) *
    loadFactor;
  if (settings.weekendStrategy === "light" && isWeekend(date)) {
    factor *= PLANNER_CONFIG.weekendLightFactor;
  }

  const capacityMinutes = Math.round(
    Math.min(
      Math.round(settings.dailyHours * 60),
      settings.maxSessionsPerDay * settings.sessionMinutes,
    ) * Math.min(factor, 1.25),
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
  return { date, isOffDay, isVacation, capacityMinutes, sessions };
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

/** Minutes of study capacity in a typical week (aggressiveness applied,
 * transient burnout damping and vacations excluded). */
export function weeklyCapacityMinutes(settings: PlannerSettings): number {
  const perDay = Math.round(
    Math.min(
      Math.round(settings.dailyHours * 60),
      settings.maxSessionsPerDay * settings.sessionMinutes,
    ) *
      Math.min(
        PLANNER_CONFIG.aggressivenessFactor[settings.aggressiveness] ?? 1,
        1.25,
      ),
  );
  let weekend = 0;
  if (settings.weekendStrategy === "light") {
    // Roughly two weekend days, one usually the off day already.
    weekend = perDay * (1 - PLANNER_CONFIG.weekendLightFactor);
  }
  return Math.round(perDay * studyDaysPerWeek(settings) - weekend);
}
