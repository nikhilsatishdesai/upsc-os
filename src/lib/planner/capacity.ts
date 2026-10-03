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

/** Study hours available on a weekday (0 = Sunday): the personal
 * timetable's override when set, otherwise the everyday `dailyHours`. */
export function hoursForWeekday(
  weekday: number,
  settings: PlannerSettings,
): number {
  const override = settings.weekdayHours?.[weekday];
  return typeof override === "number" ? override : settings.dailyHours;
}

/**
 * A day's usable study capacity: the base (that weekday's hours vs
 * sessions×duration, whichever is smaller) scaled by planner
 * aggressiveness, the weekend strategy, and any transient burnout damping
 * (`loadFactor`). A weekday set to 0 hours in the timetable is a rest day.
 */
export function dayCapacity(
  date: string,
  settings: PlannerSettings,
  loadFactor: number = 1,
): DayCapacity {
  const weekday = weekdayOf(date);
  const hours = hoursForWeekday(weekday, settings);
  const isOffDay =
    (settings.weeklyOffDay >= 0 && weekday === settings.weeklyOffDay) ||
    hours <= 0;
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
      Math.round(hours * 60),
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
  if (slot === "afternoon" && settings.afternoonStartTime) {
    return settings.afternoonStartTime;
  }
  if (slot === "evening" && settings.eveningStartTime) {
    return settings.eveningStartTime;
  }
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
  if (settings.weekdayHours?.some((hours) => typeof hours === "number")) {
    return timetableWeeklyMinutes(settings);
  }
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

/** Weekly capacity when the personal timetable sets per-weekday hours:
 * the sum of each weekday's real capacity (off/rest days contribute 0;
 * with no fixed off day the auto recovery day is prorated in). */
function timetableWeeklyMinutes(settings: PlannerSettings): number {
  const factor = Math.min(
    PLANNER_CONFIG.aggressivenessFactor[settings.aggressiveness] ?? 1,
    1.25,
  );
  let total = 0;
  for (let weekday = 0; weekday < 7; weekday++) {
    if (settings.weeklyOffDay >= 0 && weekday === settings.weeklyOffDay) continue;
    const hours = hoursForWeekday(weekday, settings);
    if (hours <= 0) continue;
    let dayFactor = factor;
    if (settings.weekendStrategy === "light" && (weekday === 0 || weekday === 6)) {
      dayFactor *= PLANNER_CONFIG.weekendLightFactor;
    }
    total +=
      Math.min(
        Math.round(hours * 60),
        settings.maxSessionsPerDay * settings.sessionMinutes,
      ) * dayFactor;
  }
  if (settings.weeklyOffDay < 0) {
    total *= studyDaysPerWeek(settings) / 7;
  }
  return Math.round(total);
}
