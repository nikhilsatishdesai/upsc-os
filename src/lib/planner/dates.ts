/** Local-timezone date helpers. Dates are passed around as "YYYY-MM-DD". */

export function toDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayStr(): string {
  return toDateStr(new Date());
}

export function parseDateStr(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function isValidDateStr(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function addDays(dateStr: string, days: number): string {
  const date = parseDateStr(dateStr);
  date.setDate(date.getDate() + days);
  return toDateStr(date);
}

/** Whole days from `a` to `b` (positive when b is later). */
export function diffDays(a: string, b: string): number {
  return Math.round(
    (parseDateStr(b).getTime() - parseDateStr(a).getTime()) / 86_400_000,
  );
}

/** 0 (Sunday) – 6 (Saturday). */
export function weekdayOf(dateStr: string): number {
  return parseDateStr(dateStr).getDay();
}

/** Monday of the week containing `dateStr`. */
export function startOfWeek(dateStr: string): string {
  const day = weekdayOf(dateStr);
  return addDays(dateStr, day === 0 ? -6 : 1 - day);
}

export function startOfMonth(dateStr: string): string {
  return dateStr.slice(0, 8) + "01";
}

export function formatDayShort(dateStr: string): string {
  return parseDateStr(dateStr).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function formatDateLong(dateStr: string): string {
  return parseDateStr(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/**
 * Typical UPSC CSE dates as an editable estimate: Prelims on the last
 * Sunday of May (next year once this year's has passed), Mains on the
 * Friday about sixteen weeks later. Always shown as an estimate.
 */
export function typicalExamDates(today: string = todayStr()): {
  prelims: string;
  mains: string;
} {
  const year = Number(today.slice(0, 4));
  const lastSundayOfMay = (y: number) => {
    let date = `${y}-05-31`;
    while (weekdayOf(date) !== 0) date = addDays(date, -1);
    return date;
  };
  let prelims = lastSundayOfMay(year);
  if (prelims <= today) prelims = lastSundayOfMay(year + 1);
  let mains = addDays(prelims, 16 * 7);
  while (weekdayOf(mains) !== 5) mains = addDays(mains, 1);
  return { prelims, mains };
}
