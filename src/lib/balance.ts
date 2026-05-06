import { startOfWeek, endOfWeek, parseISO, format } from "date-fns";
import type { Shift, ShiftSegment, User } from "@/lib/store";

const DEFAULT_TARGET_MIN = 37 * 60 + 30; // 37.5h

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
  targetMin?: number;     // default 37.5h
  jitterMin?: number;     // randomness window (per-segment) in minutes
  totalJitterMin?: number; // randomness on the global target
}

/**
 * Adjust a user's week shifts so total work minutes lands near targetMin (+random jitter).
 * Works iteratively: each call regenerates a new (slightly different) layout.
 */
export function magicBalanceWeek(
  _user: User,
  weekShifts: Shift[],
  opts: BalanceOptions = {},
): BalanceResult {
  const target = opts.targetMin ?? DEFAULT_TARGET_MIN;
  const totalJitter = opts.totalJitterMin ?? 0;
  const segJitter = opts.jitterMin ?? 0;

  const sorted = weekShifts
    .filter((s) => s.segments && s.segments.length)
    .sort((a, b) => a.date.localeCompare(b.date));

  const totalBefore = sorted.reduce((a, s) => a + shiftWorkMinutes(s), 0);

  // Random objective inside [target - totalJitter, target + totalJitter]
  const jitterTotal = Math.round((Math.random() * 2 - 1) * totalJitter);
  const targetTotal = target + jitterTotal;
  let delta = targetTotal - totalBefore;

  type Ref = { shiftId: string; segIdx: number };
  const workRefs: Ref[] = [];
  sorted.forEach((s) => {
    s.segments!.forEach((seg, idx) => {
      if (seg.type === "work") workRefs.push({ shiftId: s.id, segIdx: idx });
    });
  });
  if (workRefs.length === 0) return { changed: [], totalBefore, totalAfter: totalBefore, targetMin: target };

  const adjust: Record<string, number> = {};
  workRefs.forEach((r) => (adjust[`${r.shiftId}|${r.segIdx}`] = 0));

  // Distribute the delta in 1-minute steps round-robin (deterministic part).
  let i = 0;
  let safety = 20000;
  while (delta !== 0 && safety-- > 0) {
    const r = workRefs[i % workRefs.length];
    const k = `${r.shiftId}|${r.segIdx}`;
    if (delta > 0 && adjust[k] < 90) {
      adjust[k] += 1;
      delta -= 1;
    } else if (delta < 0 && adjust[k] > -90) {
      adjust[k] -= 1;
      delta += 1;
    }
    i++;
  }

  // Add per-segment jitter that nets out to zero so total is preserved.
  if (segJitter > 0 && workRefs.length > 1) {
    const jitters = workRefs.map(() => Math.round((Math.random() * 2 - 1) * segJitter));
    const sum = jitters.reduce((a, b) => a + b, 0);
    // Spread the negative of the sum across segments to neutralize.
    const correction = Math.round(sum / workRefs.length);
    for (let j = 0; j < workRefs.length; j++) {
      const k = `${workRefs[j].shiftId}|${workRefs[j].segIdx}`;
      adjust[k] += jitters[j] - correction;
    }
  }

  const changed: BalanceResult["changed"] = [];
  let totalAfter = 0;

  for (const sh of sorted) {
    const segs = sh.segments!.map((s) => ({ ...s }));
    let cumulative = 0;
    for (let idx = 0; idx < segs.length; idx++) {
      const seg = segs[idx];
      const startMin = toMin(seg.start) + cumulative;
      let endMin = toMin(seg.end) + cumulative;
      if (seg.type === "work") {
        const d = adjust[`${sh.id}|${idx}`] ?? 0;
        endMin += d;
        cumulative += d;
      }
      seg.start = toHHMM(startMin);
      seg.end = toHHMM(endMin);
    }
    totalAfter += segs.reduce((a, x) => a + segWork(x), 0);
    const startISO = new Date(`${sh.date}T${segs[0].start}:00`).toISOString();
    const endISO = new Date(`${sh.date}T${segs[segs.length - 1].end}:00`).toISOString();
    changed.push({ id: sh.id, segments: segs, start: startISO, end: endISO });
  }

  return { changed, totalBefore, totalAfter, targetMin: targetTotal };
}

/**
 * Re-scale a set of shifts so their total work minutes equals targetMin,
 * preserving relative day proportions (so Friday stays shorter).
 */
export function rebalanceShifts(
  shifts: Shift[],
  targetMin: number,
  jitterMin = 0,
): BalanceResult["changed"] {
  const totalBefore = shifts.reduce((a, s) => a + shiftWorkMinutes(s), 0);
  if (totalBefore === 0) return [];
  const factor = targetMin / totalBefore;

  const out: BalanceResult["changed"] = [];
  for (const sh of shifts) {
    if (!sh.segments || sh.segments.length === 0) continue;
    const segs = sh.segments.map((s) => ({ ...s }));
    let cumulative = 0;
    for (let idx = 0; idx < segs.length; idx++) {
      const seg = segs[idx];
      const startMin = toMin(seg.start) + cumulative;
      let endMin = toMin(seg.end) + cumulative;
      if (seg.type === "work") {
        const dur = endMin - startMin;
        const newDur = Math.max(15, Math.round(dur * factor + (Math.random() * 2 - 1) * jitterMin));
        const diff = newDur - dur;
        endMin += diff;
        cumulative += diff;
      }
      seg.start = toHHMM(startMin);
      seg.end = toHHMM(endMin);
    }
    out.push({
      id: sh.id,
      segments: segs,
      start: new Date(`${sh.date}T${segs[0].start}:00`).toISOString(),
      end: new Date(`${sh.date}T${segs[segs.length - 1].end}:00`).toISOString(),
    });
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
