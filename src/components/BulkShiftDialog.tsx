import { useMemo, useState } from "react";
import { eachDayOfInterval, format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { useAppStore, isHoliday, isVacation, isFreeDay, type Shift, type ShiftSegment } from "@/lib/store";
import { SegmentEditor, makeSegment } from "@/components/SegmentEditor";
import { toast } from "sonner";

const dayLabels = [
  { i: 1, label: "Lun" },
  { i: 2, label: "Mar" },
  { i: 3, label: "Mié" },
  { i: 4, label: "Jue" },
  { i: 5, label: "Vie" },
  { i: 6, label: "Sáb" },
  { i: 0, label: "Dom" },
];

export function BulkShiftDialog({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (s: Omit<Shift, "id">[]) => void;
}) {
  const { users, currentUserId, holidays, vacations, freeDays } = useAppStore();
  const [userId, setUserId] = useState(currentUserId);
  const [range, setRange] = useState<{ from?: Date; to?: Date }>({});
  const [allowedDays, setAllowedDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [randomize, setRandomize] = useState(false);
  const [jitterSec, setJitterSec] = useState(120);
  const [segments, setSegments] = useState<ShiftSegment[]>([
    makeSegment("work", "09:00", "13:00"),
    makeSegment("break", "13:00", "14:00"),
    makeSegment("work", "14:00", "18:00"),
  ]);

  const toggleDay = (i: number) => {
    setAllowedDays((d) => (d.includes(i) ? d.filter((x) => x !== i) : [...d, i].sort()));
  };

  const previewDays = useMemo(() => {
    if (!range.from || !range.to) return [];
    return eachDayOfInterval({ start: range.from, end: range.to }).filter((d) =>
      allowedDays.includes(d.getDay()),
    );
  }, [range, allowedDays]);

  const skippedCount = useMemo(() => {
    return previewDays.filter((d) => {
      const date = format(d, "yyyy-MM-dd");
      return isHoliday(date, holidays) || isVacation(date, userId, vacations) || isFreeDay(date, userId, freeDays);
    }).length;
  }, [previewDays, holidays, vacations, freeDays, userId]);

  const submit = () => {
    if (!range.from || !range.to) {
      toast.error("Selecciona un rango de fechas en el calendario");
      return;
    }
    if (segments.length === 0) {
      toast.error("Añade al menos una franja");
      return;
    }
    if (previewDays.length === 0) {
      toast.error("Ningún día seleccionado con esos filtros");
      return;
    }
    const ordered = [...segments].sort((a, b) => a.start.localeCompare(b.start));

    const toMin = (t: string) => {
      const [h, m] = t.split(":").map(Number);
      return h * 60 + m;
    };
    const toHHMM = (mins: number) => {
      const m = ((mins % 1440) + 1440) % 1440;
      return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
    };

    const arr: Omit<Shift, "id">[] = [];
    let skipped = 0;
    for (const d of previewDays) {
      const date = format(d, "yyyy-MM-dd");
      if (isHoliday(date, holidays) || isVacation(date, userId, vacations) || isFreeDay(date, userId, freeDays)) {
        skipped++;
        continue;
      }
      // build segments with optional jitter (in minutes, derived from seconds)
      const daySegs = ordered.map((s) => {
        if (!randomize) return { ...s, id: Math.random().toString(36).slice(2, 10) };
        const offMinStart = Math.round(((Math.random() * 2 - 1) * jitterSec) / 60);
        const offMinEnd = Math.round(((Math.random() * 2 - 1) * jitterSec) / 60);
        return {
          ...s,
          id: Math.random().toString(36).slice(2, 10),
          start: toHHMM(toMin(s.start) + offMinStart),
          end: toHHMM(toMin(s.end) + offMinEnd),
        };
      });
      const start = new Date(`${date}T${daySegs[0].start}:00`).toISOString();
      const end = new Date(`${date}T${daySegs[daySegs.length - 1].end}:00`).toISOString();
      arr.push({ userId, date, start, end, status: "finished", segments: daySegs });
    }
    onSave(arr);
    if (skipped > 0) toast.info(`${skipped} día${skipped === 1 ? "" : "s"} omitido${skipped === 1 ? "" : "s"} (festivos / vacaciones / día libre)`);
    onClose();
  };

  return (
    <DialogContent className="max-w-3xl">
      <DialogHeader>
        <DialogTitle>Añadir jornadas en lote</DialogTitle>
        <DialogDescription>
          Selecciona un rango en el calendario, marca los días de la semana a incluir y define
          las franjas horarias que se aplicarán a cada jornada.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label>Usuario</Label>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Rango de fechas</Label>
            <div className="rounded-md border">
              <Calendar
                mode="range"
                selected={range as never}
                onSelect={(r) => setRange((r as { from?: Date; to?: Date }) ?? {})}
                numberOfMonths={1}
                weekStartsOn={1}
                className={cn("p-3 pointer-events-auto")}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {range.from && range.to
                ? `${format(range.from, "dd/MM/yyyy")} → ${format(range.to, "dd/MM/yyyy")} · ${previewDays.length} jornadas`
                : range.from
                ? `Inicio ${format(range.from, "dd/MM/yyyy")} — selecciona el final`
                : "Haz clic en una fecha de inicio y otra de fin"}
            </p>
          </div>

          <div className="grid gap-2">
            <Label>Días incluidos</Label>
            <div className="flex flex-wrap gap-1.5">
              {dayLabels.map((d) => {
                const active = allowedDays.includes(d.i);
                return (
                  <button
                    key={d.i}
                    type="button"
                    onClick={() => toggleDay(d.i)}
                    className={cn(
                      "h-9 w-12 rounded-md border text-xs font-medium transition-colors",
                      active
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background hover:bg-muted",
                    )}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div>
          <SegmentEditor segments={segments} onChange={setSegments} />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={submit}>
          Crear {previewDays.length || ""} jornada{previewDays.length === 1 ? "" : "s"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

