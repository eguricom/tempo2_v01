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
  const [useUserSchedule, setUseUserSchedule] = useState(true);
  const [segments, setSegments] = useState<ShiftSegment[]>([
    makeSegment("work", "09:00", "13:00"),
    makeSegment("break", "13:00", "14:00"),
    makeSegment("work", "14:00", "18:00"),
  ]);

  const user = users.find((u) => u.id === userId);

  const toggleDay = (i: number) => {
    setAllowedDays((d) => (d.includes(i) ? d.filter((x) => x !== i) : [...d, i].sort()));
  };

  const previewDays = useMemo(() => {
    if (!range.from || !range.to) return [];
    return eachDayOfInterval({ start: range.from, end: range.to }).filter((d) =>
      allowedDays.includes(d.getDay()),
    );
  }, [range, allowedDays]);

  const counters = useMemo(() => {
    let skipped = 0;
    let noSchedule = 0;
    let valid = 0;
    for (const d of previewDays) {
      const date = format(d, "yyyy-MM-dd");
      if (isHoliday(date, holidays) || isVacation(date, userId, vacations) || isFreeDay(date, userId, freeDays)) {
        skipped++;
        continue;
      }
      if (useUserSchedule) {
        const tmpl = user?.schedule?.[d.getDay()] ?? [];
        if (tmpl.filter((s) => s.type === "work").length === 0) {
          noSchedule++;
          continue;
        }
      }
      valid++;
    }
    return { skipped, noSchedule, valid };
  }, [previewDays, holidays, vacations, freeDays, userId, useUserSchedule, user]);

  const submit = () => {
    if (!range.from || !range.to) {
      toast.error("Selecciona un rango de fechas en el calendario");
      return;
    }
    if (!useUserSchedule && segments.length === 0) {
      toast.error("Añade al menos una franja");
      return;
    }
    if (previewDays.length === 0) {
      toast.error("Ningún día seleccionado con esos filtros");
      return;
    }

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
    let noSched = 0;
    for (const d of previewDays) {
      const date = format(d, "yyyy-MM-dd");
      if (isHoliday(date, holidays) || isVacation(date, userId, vacations) || isFreeDay(date, userId, freeDays)) {
        skipped++;
        continue;
      }
      // pick template per day
      let template: ShiftSegment[];
      if (useUserSchedule) {
        const tmpl = user?.schedule?.[d.getDay()] ?? [];
        if (tmpl.filter((s) => s.type === "work").length === 0) {
          noSched++;
          continue;
        }
        template = [...tmpl].sort((a, b) => a.start.localeCompare(b.start));
      } else {
        template = [...segments].sort((a, b) => a.start.localeCompare(b.start));
      }

      const daySegs = template.map((s) => {
        if (!randomize) return { ...s, id: Math.random().toString(36).slice(2, 10) };
        const offS = Math.round(((Math.random() * 2 - 1) * jitterSec) / 60);
        const offE = Math.round(((Math.random() * 2 - 1) * jitterSec) / 60);
        return {
          ...s,
          id: Math.random().toString(36).slice(2, 10),
          start: toHHMM(toMin(s.start) + offS),
          end: toHHMM(toMin(s.end) + offE),
        };
      });
      const start = new Date(`${date}T${daySegs[0].start}:00`).toISOString();
      const end = new Date(`${date}T${daySegs[daySegs.length - 1].end}:00`).toISOString();
      arr.push({ userId, date, start, end, status: "finished", segments: daySegs });
    }
    onSave(arr);
    if (skipped > 0) toast.info(`${skipped} día${skipped === 1 ? "" : "s"} omitido${skipped === 1 ? "" : "s"} (festivo / vacaciones / libre)`);
    if (noSched > 0) toast.info(`${noSched} día${noSched === 1 ? "" : "s"} sin horario en el usuario`);
    onClose();
  };

  return (
    <DialogContent className="max-w-3xl">
      <DialogHeader>
        <DialogTitle>Añadir jornadas en lote</DialogTitle>
        <DialogDescription>
          Por defecto se usan las franjas del horario semanal del usuario (cada día puede ser distinto, p.ej. viernes corto).
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label>Usuario</Label>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name} {u.lastName}</SelectItem>)}
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
                ? `${format(range.from, "dd/MM/yyyy")} → ${format(range.to, "dd/MM/yyyy")}`
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

        <div className="space-y-3">
          <div className="rounded-md border p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox id="usesched" checked={useUserSchedule} onCheckedChange={(v) => setUseUserSchedule(!!v)} />
              <Label htmlFor="usesched" className="cursor-pointer text-sm">
                Usar horario semanal del usuario
              </Label>
            </div>
            <p className="text-[11px] text-muted-foreground pl-6">
              Cada día tomará las franjas configuradas en su perfil. Los días sin horario se omiten.
            </p>
          </div>

          {!useUserSchedule && <SegmentEditor segments={segments} onChange={setSegments} />}

          <div className="rounded-md border p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox id="randomize" checked={randomize} onCheckedChange={(v) => setRandomize(!!v)} />
              <Label htmlFor="randomize" className="cursor-pointer text-sm">
                Aleatorizar inicio/fin de franjas
              </Label>
            </div>
            {randomize && (
              <div className="grid gap-2 pl-6">
                <Label className="text-xs">Desfase máximo (segundos): ±{jitterSec}s</Label>
                <input
                  type="range"
                  min={10}
                  max={120}
                  step={10}
                  value={jitterSec}
                  onChange={(e) => setJitterSec(+e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="rounded-md border p-3 text-xs space-y-1">
            <p><span className="font-medium">{counters.valid}</span> jornadas a crear</p>
            {counters.skipped > 0 && <p className="text-warning-foreground">{counters.skipped} días omitidos (festivo/vacaciones/libre)</p>}
            {counters.noSchedule > 0 && <p className="text-muted-foreground">{counters.noSchedule} días sin horario configurado</p>}
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={submit} disabled={counters.valid === 0}>
          Crear {counters.valid || ""} jornada{counters.valid === 1 ? "" : "s"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
