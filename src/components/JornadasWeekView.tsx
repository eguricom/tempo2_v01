import { useMemo, useState } from "react";
import { eachDayOfInterval, endOfWeek, format, parseISO, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Sparkles, Check, X } from "lucide-react";
import {
  useAppStore,
  shiftMinutes,
  formatDuration,
  isHoliday,
  isVacation,
  isFreeDay,
  type Shift,
  type ShiftSegment,
} from "@/lib/store";
import { magicBalanceWeek, rebalanceShifts } from "@/lib/balance";
import { SegmentChips } from "@/components/SegmentChips";
import { toast } from "sonner";

const dayNames = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const PAGE = 6;

function weekKey(d: Date) {
  return format(startOfWeek(d, { weekStartsOn: 1 }), "yyyy-MM-dd");
}

export function JornadasWeekView({ userId }: { userId?: string }) {
  const { shifts, users, holidays, vacations, freeDays, devMode, updateShift } = useAppStore();
  const [jitter, setJitter] = useState(15);
  const [editingTotal, setEditingTotal] = useState<string | null>(null);
  const [totalInput, setTotalInput] = useState("");
  const [pageCount, setPageCount] = useState(PAGE);

  const visible = useMemo(
    () => (userId ? shifts.filter((s) => s.userId === userId) : shifts),
    [shifts, userId],
  );

  const allWeeks = useMemo(() => {
    if (visible.length === 0) return [] as { key: string; start: Date; end: Date; days: Date[]; items: Shift[] }[];
    const byWeek = new Map<string, Shift[]>();
    for (const s of visible) {
      const k = weekKey(parseISO(s.start));
      if (!byWeek.has(k)) byWeek.set(k, []);
      byWeek.get(k)!.push(s);
    }
    return Array.from(byWeek.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([k, items]) => {
        const start = parseISO(k);
        const end = endOfWeek(start, { weekStartsOn: 1 });
        return { key: k, start, end, days: eachDayOfInterval({ start, end }), items };
      });
  }, [visible]);

  const weeks = allWeeks.slice(0, pageCount);

  const runMagic = (weekShifts: Shift[]) => {
    if (!userId) {
      toast.error("Selecciona un usuario para usar el cuadre mágico");
      return;
    }
    const user = users.find((u) => u.id === userId);
    if (!user) return;
    const result = magicBalanceWeek(user, weekShifts, { jitterMin: jitter, totalJitterMin: Math.min(jitter * 2, 30) });
    if (result.changed.length === 0) {
      toast.info("No hay franjas que ajustar");
      return;
    }
    result.changed.forEach((c) =>
      updateShift(c.id, { segments: c.segments, start: c.start, end: c.end, status: "finished" }),
    );
    toast.success(`Cuadrado: ${(result.totalAfter / 60).toFixed(2)}h (objetivo ${(result.targetMin / 60).toFixed(2)}h)`);
  };

  const applyTotal = (weekShifts: Shift[]) => {
    const parts = totalInput.split(":").map((x) => +x);
    let mins = 0;
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) mins = parts[0] * 60 + parts[1];
    else if (!isNaN(+totalInput)) mins = Math.round(+totalInput * 60);
    if (mins <= 0) {
      toast.error("Total inválido (formato HH:MM o número de horas)");
      return;
    }
    const changed = rebalanceShifts(weekShifts, mins, jitter);
    changed.forEach((c) =>
      updateShift(c.id, { segments: c.segments, start: c.start, end: c.end, status: "finished" }),
    );
    setEditingTotal(null);
    toast.success(`Semana reescalada a ${formatDuration(mins)}`);
  };

  const editSegment = (shift: Shift, segId: string, patch: Partial<ShiftSegment>) => {
    if (!shift.segments) return;
    const segs = shift.segments.map((s) => (s.id === segId ? { ...s, ...patch } : s));
    const ordered = [...segs].sort((a, b) => a.start.localeCompare(b.start));
    updateShift(shift.id, {
      segments: ordered,
      start: new Date(`${shift.date}T${ordered[0].start}:00`).toISOString(),
      end: new Date(`${shift.date}T${ordered[ordered.length - 1].end}:00`).toISOString(),
    });
  };

  if (allWeeks.length === 0) {
    return (
      <Card className="p-12 text-center text-sm text-muted-foreground">
        No hay jornadas para mostrar. Selecciona un usuario o registra una jornada.
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {devMode && (
        <Card className="flex flex-wrap items-center gap-3 p-3 no-print">
          <span className="text-xs font-medium">Aleatoriedad del cuadre mágico: ±{jitter} min</span>
          <input
            type="range"
            min={0}
            max={30}
            step={1}
            value={jitter}
            onChange={(e) => setJitter(+e.target.value)}
            className="flex-1 max-w-xs"
          />
        </Card>
      )}

      {weeks.map((w) => {
        const total = w.items.reduce((a, s) => a + shiftMinutes(s), 0);
        const byDay = new Map<string, Shift[]>();
        w.items.forEach((s) => {
          const k = s.start.slice(0, 10);
          if (!byDay.has(k)) byDay.set(k, []);
          byDay.get(k)!.push(s);
        });
        return (
          <Card key={w.key} className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/30 px-4 py-2.5">
              <div className="text-sm font-medium">
                Semana del {format(w.start, "d MMM", { locale: es })} al {format(w.end, "d MMM yyyy", { locale: es })}
              </div>
              <div className="flex items-center gap-2">
                {editingTotal === w.key ? (
                  <>
                    <Input
                      autoFocus
                      className="h-8 w-28 text-sm"
                      placeholder="HH:MM o 37.5"
                      value={totalInput}
                      onChange={(e) => setTotalInput(e.target.value)}
                    />
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => applyTotal(w.items)}>
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingTotal(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <button
                    type="button"
                    disabled={!devMode}
                    onClick={() => {
                      setEditingTotal(w.key);
                      setTotalInput(`${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`);
                    }}
                    className="rounded bg-background px-2.5 py-1 text-sm font-semibold tabular-nums shadow-sm hover:bg-muted disabled:opacity-60"
                    title={devMode ? "Editar total semanal" : "Modo dev requerido"}
                  >
                    {formatDuration(total)}
                  </button>
                )}
                {devMode && (
                  <Button size="sm" variant="outline" onClick={() => runMagic(w.items)}>
                    <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Cuadre mágico
                  </Button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 divide-x sm:grid-cols-4 lg:grid-cols-7">
              {w.days.map((d, idx) => {
                const date = format(d, "yyyy-MM-dd");
                const items = byDay.get(date) ?? [];
                const dayTotal = items.reduce((a, s) => a + shiftMinutes(s), 0);
                const holiday = isHoliday(date, holidays);
                const vacation = userId ? isVacation(date, userId, vacations) : undefined;
                const free = userId ? isFreeDay(date, userId, freeDays) : undefined;
                const bg = holiday?.color
                  ? { backgroundColor: holiday.color + "22" }
                  : vacation?.color
                  ? { backgroundColor: vacation.color + "22" }
                  : undefined;
                return (
                  <div
                    key={date}
                    className={`min-h-[120px] p-2 text-xs ${
                      holiday && !holiday.color ? "bg-destructive/5" :
                      vacation && !vacation.color ? "bg-success/5" :
                      free ? "bg-warning/5" : ""
                    }`}
                    style={bg}
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span className="font-medium">{dayNames[idx]} {format(d, "d")}</span>
                      {dayTotal > 0 && (
                        <span className="tabular-nums text-muted-foreground">{formatDuration(dayTotal)}</span>
                      )}
                    </div>
                    {holiday && (
                      <div className="mb-1 rounded px-1 py-0.5 text-[10px] font-medium" style={{ backgroundColor: (holiday.color ?? "#ef4444") + "33" }}>
                        🎉 {holiday.label || holiday.name}
                      </div>
                    )}
                    {vacation && (
                      <div className="mb-1 rounded px-1 py-0.5 text-[10px] font-medium" style={{ backgroundColor: (vacation.color ?? "#22c55e") + "33" }}>
                        ✈️ {vacation.label || (vacation.kind ?? "Vacaciones")}
                      </div>
                    )}
                    {free && (
                      <div className="mb-1 rounded bg-warning/20 px-1 py-0.5 text-[10px] font-medium">
                        Día libre
                      </div>
                    )}
                    {items.length > 0 && (
                      <div className="space-y-1">
                        {items.map((s) => (
                          <SegmentChips
                            key={s.id}
                            segments={s.segments}
                            size="xs"
                            onSegmentChange={devMode ? (id, patch) => editSegment(s, id, patch) : undefined}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        );
      })}

      {pageCount < allWeeks.length && (
        <div className="flex justify-center pt-2 no-print">
          <Button variant="outline" size="sm" onClick={() => setPageCount((c) => c + PAGE)}>
            Cargar {Math.min(PAGE, allWeeks.length - pageCount)} semanas más
          </Button>
        </div>
      )}
    </div>
  );
}
