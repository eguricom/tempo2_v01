import { useMemo, useState } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  parseISO,
  addMonths,
  subMonths,
} from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { useAppStore, shiftMinutes, formatDuration, type Shift } from "@/lib/store";
import { ShiftFormDialog } from "@/components/ShiftFormDialog";
import { toast } from "sonner";

export function ShiftsCalendar({ userId }: { userId?: string }) {
  const { shifts, users, addShift, updateShift, deleteShift, devMode, currentUserId } = useAppStore();
  const [cursor, setCursor] = useState(new Date());
  const [editing, setEditing] = useState<Shift | null>(null);
  const [creatingDate, setCreatingDate] = useState<string | null>(null);

  const visible = userId ? shifts.filter((s) => s.userId === userId) : shifts;

  const canEdit = (s: Shift) =>
    devMode || (s.status === "in_progress" && s.userId === currentUserId);

  const tryCreate = (date: string) => {
    if (!devMode) {
      toast.error("Activa el modo desarrollador para añadir fichajes manualmente");
      return;
    }
    setCreatingDate(date);
  };

  const tryEdit = (s: Shift) => {
    if (!canEdit(s)) {
      toast.error("Solo puedes editar la jornada en curso");
      return;
    }
    setEditing(s);
  };

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  const shiftsByDay = useMemo(() => {
    const map = new Map<string, Shift[]>();
    visible.forEach((s) => {
      const key = s.start.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    });
    return map;
  }, [visible]);

  const weekHeaders = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setCursor(subMonths(cursor, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-base font-semibold capitalize">
            {format(cursor, "MMMM yyyy", { locale: es })}
          </h3>
          <Button variant="ghost" size="icon" onClick={() => setCursor(addMonths(cursor, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="ml-2" onClick={() => setCursor(new Date())}>
            Hoy
          </Button>
        </div>
        <Button
          size="sm"
          onClick={() => setCreatingDate(format(new Date(), "yyyy-MM-dd"))}
        >
          <Plus className="mr-2 h-4 w-4" /> Añadir fichaje
        </Button>
      </div>

      <div className="grid grid-cols-7 border-b bg-muted/30 text-center text-xs font-medium text-muted-foreground">
        {weekHeaders.map((d) => (
          <div key={d} className="py-2">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((d) => {
          const key = format(d, "yyyy-MM-dd");
          const items = shiftsByDay.get(key) ?? [];
          const total = items.reduce((acc, s) => acc + shiftMinutes(s), 0);
          const inMonth = isSameMonth(d, cursor);
          const isToday = isSameDay(d, new Date());

          return (
            <div
              key={key}
              className={`group relative min-h-[110px] border-b border-r p-1.5 text-left transition-colors hover:bg-accent/40 ${
                inMonth ? "bg-background" : "bg-muted/20"
              }`}
            >
              <div className="mb-1 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCreatingDate(key)}
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                    isToday
                      ? "bg-primary text-primary-foreground"
                      : inMonth
                      ? "text-foreground hover:bg-muted"
                      : "text-muted-foreground/60"
                  }`}
                >
                  {format(d, "d")}
                </button>
                {total > 0 && (
                  <span className="text-[10px] font-medium tabular-nums text-muted-foreground">
                    {formatDuration(total)}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setCreatingDate(key)}
                  className="absolute right-1 top-1 hidden h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary opacity-0 transition-opacity hover:bg-primary hover:text-primary-foreground group-hover:flex group-hover:opacity-100"
                  aria-label="Añadir fichaje"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>

              <div className="space-y-1">
                {items.slice(0, 3).map((s) => {
                  const u = users.find((x) => x.id === s.userId);
                  const inProgress = s.status === "in_progress";
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setEditing(s)}
                      className={`block w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] font-medium transition-colors ${
                        inProgress
                          ? "bg-warning/20 text-warning-foreground hover:bg-warning/30"
                          : "bg-primary/10 text-primary hover:bg-primary/20"
                      }`}
                      title={`${u?.name ?? ""} · ${format(parseISO(s.start), "HH:mm")}${s.end ? `–${format(parseISO(s.end), "HH:mm")}` : ""}`}
                    >
                      <span className="tabular-nums">{format(parseISO(s.start), "HH:mm")}</span>
                      {!userId && u && <span className="ml-1 opacity-70">· {u.name.split(" ")[0]}</span>}
                    </button>
                  );
                })}
                {items.length > 3 && (
                  <span className="block px-1 text-[10px] text-muted-foreground">
                    +{items.length - 3} más
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* New shift dialog */}
      <Dialog open={!!creatingDate} onOpenChange={(o) => !o && setCreatingDate(null)}>
        {creatingDate && (
          <ShiftFormDialog
            defaultDate={creatingDate}
            defaultUserId={userId}
            onClose={() => setCreatingDate(null)}
            onSave={(s) => {
              addShift(s);
              toast.success("Jornada añadida");
            }}
          />
        )}
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        {editing && (
          <ShiftFormDialog
            initial={editing}
            onClose={() => setEditing(null)}
            onSave={(s) => {
              updateShift(editing.id, s);
              toast.success("Jornada actualizada");
            }}
            onDelete={() => {
              deleteShift(editing.id);
              toast.success("Jornada eliminada");
              setEditing(null);
            }}
          />
        )}
      </Dialog>
    </Card>
  );
}
