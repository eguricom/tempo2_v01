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
 * Rebuilds a single day's segments around a target work duration, jittering
 * both the entry time and segment ends. Preserves the structure (work/break order).
 */
function rebuildDay(segments: ShiftSegment[], targetWorkMin: number, jitterMin: number): ShiftSegment[] {
  if (!segments || segments.length === 0) return segments;
  const ordered = [...segments].sort((a, b) => a.start.localeCompare(b.start));
  const works = ordered.filter((s) => s.type === "work");
  const breaks = ordered.filter((s) => s.type === "break");
  const breakTotal = breaks.reduce((a, b) => a + Math.max(0, toMin(b.end) - toMin(b.start)), 0);

  // Distribute target evenly across work segments
  const wCount = works.length || 1;
  const baseWorkPerSeg = Math.floor(targetWorkMin / wCount);
  const remainder = targetWorkMin - baseWorkPerSeg * wCount;
  const workDurs = works.map((_, i) => baseWorkPerSeg + (i < remainder ? 1 : 0));

  // Random entry shift in ±jitter
  const entryShift = jitterMin > 0 ? Math.round((Math.random() * 2 - 1) * jitterMin) : 0;
  let cursor = toMin(ordered[0].start) + entryShift;

  const out: ShiftSegment[] = [];
  let wi = 0;
  let bi = 0;
  for (const seg of ordered) {
    let dur: number;
    if (seg.type === "work") {
      dur = workDurs[wi++];
      // jitter the segment end (and thus start of next) without altering total
      // (we'll let it propagate; total is preserved per segment)
    } else {
      dur = bi < breaks.length ? Math.max(0, toMin(breaks[bi].end) - toMin(breaks[bi].start)) : 30;
      bi++;
    }
    const segJ = jitterMin > 0 && seg.type === "work" ? Math.round((Math.random() * 2 - 1) * Math.min(jitterMin, 5)) : 0;
    const start = cursor;
    const end = cursor + dur + segJ;
    out.push({ ...seg, start: toHHMM(start), end: toHHMM(end) });
    cursor = end;
  }
  // Verify cumulative work equals target (correct last work seg if rounded)
  const finalWork = out.filter((s) => s.type === "work").reduce((a, x) => a + Math.max(0, toMin(x.end) - toMin(x.start)), 0);
  const diff = targetWorkMin - finalWork;
  if (diff !== 0) {
    // adjust last work segment
    for (let i = out.length - 1; i >= 0; i--) {
      if (out[i].type === "work") {
        const newEnd = toMin(out[i].end) + diff;
        out[i] = { ...out[i], end: toHHMM(newEnd) };
        // shift subsequent segments
        let shift = diff;
        for (let j = i + 1; j < out.length; j++) {
          out[j] = {
            ...out[j],
            start: toHHMM(toMin(out[j].start) + shift),
            end: toHHMM(toMin(out[j].end) + shift),
          };
        }
        break;
      }
    }
  }
  void breakTotal;
  return out;
}

/**
 * Magic balance for a week. Adjusts both entry/exit and break boundaries while
 * keeping each weekday close to its theoretical duration (8h Mon-Thu, 5.5h Fri)
 * and the weekly total near targetMin (37.5h) ± totalJitter.
 */
export function magicBalanceWeek(
  _user: User,
  weekShifts: Shift[],
  opts: BalanceOptions = {},
): BalanceResult {
  const target = opts.targetMin ?? DEFAULT_TARGET_MIN;
  const totalJitter = opts.totalJitterMin ?? 30;
  const segJitter = opts.jitterMin ?? 15;

  const sorted = weekShifts
    .filter((s) => s.segments && s.segments.length)
    .sort((a, b) => a.date.localeCompare(b.date));

  const totalBefore = sorted.reduce((a, s) => a + shiftWorkMinutes(s), 0);
  if (sorted.length === 0) {
    return { changed: [], totalBefore: 0, totalAfter: 0, targetMin: target };
  }

  // Random objective inside [target - totalJitter, target + totalJitter]
  const jitterTotal = Math.round((Math.random() * 2 - 1) * totalJitter);
  const targetTotal = Math.max(60, target + jitterTotal);

  // Compute per-day theoretical target and scale to fit weekly target
  const dayTargets = sorted.map((sh) => {
    const dow = new Date(sh.date + "T00:00:00").getDay();
    return targetMinutesForDay(dow) || 0;
  });
  const sumTheoretical = dayTargets.reduce((a, b) => a + b, 0);
  const scale = sumTheoretical > 0 ? targetTotal / sumTheoretical : 1;

  const changed: BalanceResult["changed"] = [];
  let totalAfter = 0;
  for (let i = 0; i < sorted.length; i++) {
    const sh = sorted[i];
    const dayTarget = Math.max(60, Math.round(dayTargets[i] * scale));
    const segs = rebuildDay(sh.segments!, dayTarget, segJitter);
    totalAfter += segs.filter((s) => s.type === "work").reduce((a, x) => a + Math.max(0, toMin(x.end) - toMin(x.start)), 0);
    const startISO = new Date(`${sh.date}T${segs[0].start}:00`).toISOString();
    const endISO = new Date(`${sh.date}T${segs[segs.length - 1].end}:00`).toISOString();
    changed.push({ id: sh.id, segments: segs, start: startISO, end: endISO });
  }

  return { changed, totalBefore, totalAfter, targetMin: targetTotal };
}

/**
 * Rebalance an arbitrary set of shifts to a target total (e.g. month-level magic),
 * preserving relative day weights (Friday stays shorter).
 */
export function rebalanceShifts(
  shifts: Shift[],
  targetMin: number,
  jitterMin = 0,
): BalanceResult["changed"] {
  if (shifts.length === 0) return [];
  // Group by ISO week and balance each week proportionally to its weight in target.
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
    const r = magicBalanceWeek({} as User, wk, { targetMin: weekTarget, jitterMin, totalJitterMin: jitterMin });
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
