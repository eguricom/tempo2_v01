import { SegmentEditor } from "@/components/SegmentEditor";
import type { WeeklySchedule, ShiftSegment } from "@/lib/store";

const days: { i: number; label: string }[] = [
  { i: 1, label: "Lunes" },
  { i: 2, label: "Martes" },
  { i: 3, label: "Miércoles" },
  { i: 4, label: "Jueves" },
  { i: 5, label: "Viernes" },
  { i: 6, label: "Sábado" },
  { i: 0, label: "Domingo" },
];

export function WeeklyScheduleEditor({
  value,
  onChange,
}: {
  value: WeeklySchedule;
  onChange: (v: WeeklySchedule) => void;
}) {
  const setDay = (i: number, segs: ShiftSegment[]) => onChange({ ...value, [i]: segs });

  return (
    <div className="space-y-4">
      {days.map((d) => (
        <div key={d.i} className="rounded-md border p-3">
          <p className="mb-2 text-sm font-semibold">{d.label}</p>
          <SegmentEditor segments={value[d.i] ?? []} onChange={(s) => setDay(d.i, s)} />
        </div>
      ))}
    </div>
  );
}
