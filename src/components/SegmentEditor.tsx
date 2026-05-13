import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Briefcase, Coffee } from "lucide-react";
import type { ShiftSegment, SegmentType } from "@/lib/store";

const uid = () => Math.random().toString(36).slice(2, 10);

export function makeSegment(type: SegmentType = "work", start = "09:00", end = "13:00"): ShiftSegment {
  return { id: uid(), type, start, end };
}

export function segmentTotals(segments: ShiftSegment[]) {
  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  let work = 0;
  let brk = 0;
  segments.forEach((s) => {
    const d = Math.max(0, toMin(s.end) - toMin(s.start));
    if (s.type === "work") work += d;
    else brk += d;
  });
  return { work, brk };
}

export function SegmentEditor({
  segments,
  onChange,
}: {
  segments: ShiftSegment[];
  onChange: (s: ShiftSegment[]) => void;
}) {
  const update = (id: string, patch: Partial<ShiftSegment>) =>
    onChange(segments.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const remove = (id: string) => onChange(segments.filter((s) => s.id !== id));
  const add = (type: SegmentType) => {
    const last = segments[segments.length - 1];
    const start = last?.end ?? (type === "work" ? "09:00" : "13:00");
    const end = type === "work" ? "13:00" : "14:00";
    onChange([...segments, makeSegment(type, start, end)]);
  };

  return (
    <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label>Franjas horarias</Label>
          <div className="flex gap-1">
          <Button type="button" size="sm" variant="outline" onClick={() => add("work")}>
            <Briefcase className="mr-1.5 h-3.5 w-3.5" /> Trabajo
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => add("break")}>
            <Coffee className="mr-1.5 h-3.5 w-3.5" /> Descanso
          </Button>
        </div>
      </div>

      {segments.length === 0 && (
        <p className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">
          Sin franjas. Añade al menos una franja de trabajo.
        </p>
      )}

      <div className="space-y-2">
        {segments.map((s) => (
          <div
            key={s.id}
            className={`flex flex-wrap items-center gap-2 rounded-md border p-2 ${
              s.type === "work" ? "bg-primary/5" : "bg-warning/10"
            }`}
          >
            <Select value={s.type} onValueChange={(v) => update(s.id, { type: v as SegmentType })}>
              <SelectTrigger className="w-full sm:w-[120px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="work">Trabajo</SelectItem>
                <SelectItem value="break">Descanso</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="time"
              className="h-8 w-full sm:w-28 flex-1 sm:flex-none min-w-0"
              value={s.start}
              onChange={(e) => update(s.id, { start: e.target.value })}
            />
            <span className="text-xs text-muted-foreground">→</span>
            <Input
              type="time"
              className="h-8 w-full sm:w-28 flex-1 sm:flex-none min-w-0"
              value={s.end}
              onChange={(e) => update(s.id, { end: e.target.value })}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="ml-auto h-8 w-8 shrink-0"
              onClick={() => remove(s.id)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>

      {segments.length > 0 && (
        <SegmentSummary segments={segments} />
      )}
    </div>
  );
}

export function SegmentSummary({ segments }: { segments: ShiftSegment[] }) {
  const { work, brk } = segmentTotals(segments);
  const f = (m: number) => `${Math.floor(m / 60)}h ${m % 60}m`;
  return (
    <div className="flex gap-4 text-xs text-muted-foreground">
      <span><span className="font-medium text-foreground">{f(work)}</span> trabajados</span>
      <span><span className="font-medium text-foreground">{f(brk)}</span> de descanso</span>
    </div>
  );
}
