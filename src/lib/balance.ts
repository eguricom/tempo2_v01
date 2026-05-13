import { startOfWeek, endOfWeek, parseISO, format } from "date-fns";
import type { Shift, ShiftSegment, User } from "@/lib/store";

const DEFAULT_TARGET_MIN = 37 * 60 + 30; // 37.5h
const FRIDAY_MIN = 5 * 60 + 30; // 5.5h (8:30 a 14:00)
const REGULAR_DAY_MIN = 8 * 60; // 8h Lun-Jue

const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};
const toHHMM = (mins: number) => {
  const m = ((mins % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};

function segWork(seg: ShiftSegment) {
  if (seg.type !== "work") return 0;
  return Math.max(0, toMin(seg.end) - toMin(seg.start));
}

export function shiftWorkMinutes(s: Shift): number {
  if (!s.segments) return 0;
  return s.segments.reduce((a, x) => a + segWork(x), 0);
}

export function weekBoundsForDate(d: Date) {
  return { start: startOfWeek(d, { weekStartsOn: 1 }), end: endOfWeek(d, { weekStartsOn: 1 }) };
}

export interface BalanceResult {
  changed: { id: string; segments: ShiftSegment[]; start: string; end: string }[];
  totalBefore: number;
  totalAfter: number;
  targetMin: number;
}

export interface BalanceOptions {
  targetMin?: number;
  jitterMin?: number;       // ±jitter on entry/exit/break boundaries
  totalJitterMin?: number;  // ±jitter on weekly target
}

/**
 * Returns the target work minutes for a given weekday based on the standard rule:
 *  - Monday..Thursday: 8h
 *  - Friday: 5h30 (8:30→14:00)
 *  - Sat/Sun: 0
 */
export function targetMinutesForDay(dow: number): number {
  if (dow === 0 || dow === 6) return 0;
  if (dow === 5) return FRIDAY_MIN;
  return REGULAR_DAY_MIN;
}

/**
 * Magic balance for a week. Resets each shift to the user's schedule template
 * for that weekday and applies jitter to entry (±jitterMin) and exit (±totalJitterMin)
 * so the weekly total fluctuates naturally (≈±15 min from 37.5h).
 */
export function magicBalanceWeek(
  user: User,
  weekShifts: Shift[],
  opts: BalanceOptions = {},
): BalanceResult {
  const segJitter = opts.jitterMin ?? 15;
  const exitJitter = opts.totalJitterMin ?? Math.round(segJitter / 3);

  const sorted = weekShifts
    .filter((s) => s.segments && s.segments.length)
    .sort((a, b) => a.date.localeCompare(b.date));

  const totalBefore = sorted.reduce((a, s) => a + shiftWorkMinutes(s), 0);
  if (sorted.length === 0) {
    return { changed: [], totalBefore: 0, totalAfter: 0, targetMin: 0 };
  }

  const changed: BalanceResult["changed"] = [];
  let totalAfter = 0;
  for (const sh of sorted) {
    const dow = new Date(sh.date + "T12:00:00").getDay();
    const tmpl = user.schedule?.[dow] ?? [];
    const works = tmpl.filter((s) => s.type === "work");
    let segs: ShiftSegment[];
    if (works.length > 0) {
      const ordered = [...tmpl].sort((a, b) => a.start.localeCompare(b.start));
      const fresh: ShiftSegment[] = ordered.map((s) => ({ ...s, id: Math.random().toString(36).slice(2, 10) }));
      const entryShift = segJitter > 0 ? Math.round((Math.random() * 2 - 1) * segJitter) : 0;
      const exitShift = exitJitter > 0 ? Math.round((Math.random() * 2 - 1) * exitJitter) : 0;
      let cursor = toMin(fresh[0].start) + entryShift;
      const lastWorkIdx = [...fresh].reduce((last, s, i) => s.type === "work" ? i : last, -1);
      segs = fresh.map((s, i) => {
        const dur = Math.max(0, toMin(s.end) - toMin(s.start));
        const start = cursor;
        let end = cursor + dur;
        if (i === lastWorkIdx) end += exitShift;
        cursor = end;
        return { ...s, start: toHHMM(start), end: toHHMM(end) };
      });
    } else {
      segs = sh.segments ?? [];
    }
    totalAfter += segs.filter((s) => s.type === "work").reduce((a, x) => a + Math.max(0, toMin(x.end) - toMin(x.start)), 0);
    const startISO = new Date(`${sh.date}T${segs[0].start}:00`).toISOString();
    const endISO = new Date(`${sh.date}T${segs[segs.length - 1].end}:00`).toISOString();
    changed.push({ id: sh.id, segments: segs, start: startISO, end: endISO });
  }

  return { changed, totalBefore, totalAfter, targetMin: segJitter };
}

/**
 * Rebalance an arbitrary set of shifts to a target total (e.g. month-level magic),
 * preserving relative day weights (Friday stays shorter).
 */
export function rebalanceShifts(
  shifts: Shift[],
  targetMin: number,
  jitterMin = 0,
  user?: User,
): BalanceResult["changed"] {
  if (shifts.length === 0) return [];
  const byWeek = new Map<string, Shift[]>();
  for (const s of shifts) {
    const wk = format(startOfWeek(parseISO(s.start), { weekStartsOn: 1 }), "yyyy-MM-dd");
    if (!byWeek.has(wk)) byWeek.set(wk, []);
    byWeek.get(wk)!.push(s);
  }
  const weeks = Array.from(byWeek.values());
  const weekTarget = Math.round(targetMin / weeks.length);
  const out: BalanceResult["changed"] = [];
  for (const wk of weeks) {
    const r = magicBalanceWeek(user ?? ({} as User), wk, { targetMin: weekTarget, jitterMin, totalJitterMin: jitterMin });
    out.push(...r.changed);
  }
  return out;
}

export function groupShiftsByPeriod(
  shifts: Shift[],
  period: "week" | "month" | "year",
): Record<string, Shift[]> {
  const out: Record<string, Shift[]> = {};
  for (const s of shifts) {
    const d = parseISO(s.start);
    let key: string;
    if (period === "year") key = format(d, "yyyy");
    else if (period === "month") key = format(d, "yyyy-MM");
    else {
      const ws = startOfWeek(d, { weekStartsOn: 1 });
      key = `${format(ws, "yyyy-MM-dd")}`;
    }
    (out[key] ||= []).push(s);
  }
  return out;
}
