import { startOfWeek, endOfWeek, parseISO, format } from "date-fns";
import type { Shift, ShiftSegment, User } from "@/lib/store";

const TARGET_MIN = 37 * 60 + 30; // 37.5h
const MAX_OVER_MIN = 15;

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

/**
 * Adjust a user's week's shifts so total work minutes lands in [TARGET, TARGET+15].
 * Distributes the delta proportionally across work segments, extending end times.
 * If above target+15, contracts work segments (end-times) to land within window.
 */
export function magicBalanceWeek(user: User, weekShifts: Shift[]): BalanceResult {
  const target = TARGET_MIN;
  const upper = TARGET_MIN + MAX_OVER_MIN;

  const sorted = weekShifts
    .filter((s) => s.segments && s.segments.length)
    .sort((a, b) => a.date.localeCompare(b.date));

  const totalBefore = sorted.reduce((a, s) => a + shiftWorkMinutes(s), 0);

  const targetTotal = totalBefore < target ? target + Math.floor(MAX_OVER_MIN / 2) : Math.min(totalBefore, upper);
  let delta = targetTotal - totalBefore; // can be negative if reducing

  if (Math.abs(delta) <= 1 && totalBefore >= target && totalBefore <= upper) {
    return { changed: [], totalBefore, totalAfter: totalBefore, targetMin: target };
  }

  // Build flat list of work segment refs with day & index
  type Ref = { shiftId: string; date: string; segIdx: number };
  const workRefs: Ref[] = [];
  sorted.forEach((s) => {
    s.segments!.forEach((seg, idx) => {
      if (seg.type === "work") workRefs.push({ shiftId: s.id, date: s.date, segIdx: idx });
    });
  });
  if (workRefs.length === 0) return { changed: [], totalBefore, totalAfter: totalBefore, targetMin: target };

  // Distribute delta in 1-minute increments, round-robin across work segments
  // Limit per-segment adjustment to ±60 min to avoid weird shifts
  const adjust: Record<string, number> = {}; // key: shiftId|segIdx -> delta minutes (added to end)
  workRefs.forEach((r) => (adjust[`${r.shiftId}|${r.segIdx}`] = 0));

  let i = 0;
  let safety = 10000;
  while (delta !== 0 && safety-- > 0) {
    const r = workRefs[i % workRefs.length];
    const k = `${r.shiftId}|${r.segIdx}`;
    if (delta > 0 && adjust[k] < 60) {
      adjust[k] += 1;
      delta -= 1;
    } else if (delta < 0 && adjust[k] > -60) {
      adjust[k] -= 1;
      delta += 1;
    }
    i++;
  }

  // Build new shifts segments respecting that subsequent segments shift their start to avoid overlap.
  const changed: BalanceResult["changed"] = [];
  let totalAfter = 0;

  for (const sh of sorted) {
    const segs = sh.segments!.map((s) => ({ ...s }));
    // walk in order, applying end-shift to work, then re-anchor following segments by their original delta
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
    const work = segs.reduce((a, x) => a + segWork(x), 0);
    totalAfter += work;
    const startISO = new Date(`${sh.date}T${segs[0].start}:00`).toISOString();
    const endISO = new Date(`${sh.date}T${segs[segs.length - 1].end}:00`).toISOString();
    changed.push({ id: sh.id, segments: segs, start: startISO, end: endISO });
  }

  return { changed, totalBefore, totalAfter, targetMin: target };
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
      key = `${format(ws, "yyyy")}-W${String(getISOWeek(ws)).padStart(2, "0")}`;
    }
    (out[key] ||= []).push(s);
  }
  return out;
}

function getISOWeek(d: Date) {
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
}
