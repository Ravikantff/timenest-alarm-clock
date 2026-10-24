import { addDays, addMonths } from "date-fns";

export type Duration = { months: number; days: number; hours: number; minutes: number };

export type Alarm = {
  id: string;
  label: string;
  /** Originally scheduled ring time (epoch ms). */
  targetAt: number;
  enabled: boolean;
  snooze: Duration;
  /** Pending snooze ring time (epoch ms), overrides targetAt while set. */
  snoozedUntil: number | null;
  snoozeCount: number;
};

export const STORAGE_KEY = "timenest.alarms.v1";
export const MAX_DATE_MS = 8.64e15; // JS Date upper bound

export const emptyDuration = (): Duration => ({ months: 0, days: 0, hours: 0, minutes: 0 });

/** Calendar-month addition first, then days (calendar), then hours + minutes (absolute). */
export function addDuration(from: Date | number, d: Duration): Date | null {
  let date = new Date(from);
  if (d.months) date = addMonths(date, d.months);
  if (d.days) date = addDays(date, d.days);
  const ms = date.getTime() + d.hours * 3_600_000 + d.minutes * 60_000;
  if (!Number.isFinite(ms) || Math.abs(ms) > MAX_DATE_MS) return null;
  return new Date(ms);
}

export function isZeroDuration(d: Duration) {
  return !d.months && !d.days && !d.hours && !d.minutes;
}

/** Parse a user-typed field. Returns number or an error message. */
export function parseField(raw: string): number | string {
  const s = raw.trim();
  if (s === "") return 0;
  if (!/^\d+$/.test(s)) return "Use whole numbers (0 or more)";
  const n = Number(s);
  if (!Number.isSafeInteger(n)) return "Number is too large to calculate safely";
  return n;
}

export function formatDuration(d: Duration) {
  const parts: string[] = [];
  const p = (n: number, w: string) => n && parts.push(`${n.toLocaleString()} ${w}${n === 1 ? "" : "s"}`);
  p(d.months, "month");
  p(d.days, "day");
  p(d.hours, "hour");
  p(d.minutes, "minute");
  return parts.length ? parts.join(", ") : "0 minutes";
}

export const nextRing = (a: Alarm) => a.snoozedUntil ?? a.targetAt;

export function loadAlarms(): Alarm[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveAlarms(alarms: Alarm[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(alarms));
  } catch {
    /* storage full or blocked */
  }
}

export function relativeLabel(target: number, now: number) {
  let diff = Math.max(0, target - now);
  const d = Math.floor(diff / 86_400_000);
  diff -= d * 86_400_000;
  const h = Math.floor(diff / 3_600_000);
  diff -= h * 3_600_000;
  const m = Math.ceil(diff / 60_000);
  const parts = [];
  if (d) parts.push(`${d.toLocaleString()}d`);
  if (h) parts.push(`${h}h`);
  if (m || !parts.length) parts.push(`${m}m`);
  return `in ${parts.join(" ")}`;
}
