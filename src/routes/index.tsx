import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { AppHeader } from "@/components/AppHeader";
import { ShiftsCalendar } from "@/components/ShiftsCalendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAppStore, shiftMinutes, formatDuration } from "@/lib/store";
import { Play, Square, Clock, Calendar, Plane } from "lucide-react";
import { format, startOfWeek, endOfWeek, parseISO, isWithinInterval } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Inicio — Tempo" },
      { name: "description", content: "Tu panel de jornada actual, horas trabajadas y ausencias." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { currentUserId, users, shifts, absences, startShift, endShift } = useAppStore();
  const me = users.find((u) => u.id === currentUserId)!;
  const myShifts = shifts.filter((s) => s.userId === currentUserId);
  const active = myShifts.find((s) => s.status === "in_progress");
  const last = [...myShifts].reverse().find((s) => s.status === "finished");

  const weekTotal = useMemo(() => {
    const now = new Date();
    const start = startOfWeek(now, { weekStartsOn: 1 });
    const end = endOfWeek(now, { weekStartsOn: 1 });
    return myShifts
      .filter((s) => s.end && isWithinInterval(parseISO(s.start), { start, end }))
      .reduce((acc, s) => acc + shiftMinutes(s), 0);
  }, [myShifts]);

  const dailyMins = useMemo(() => {
    const days = ["lu", "ma", "mi", "ju", "vi", "sá", "do"];
    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
    const totals = Array(7).fill(0) as number[];
    myShifts.forEach((s) => {
      if (!s.end) return;
      const d = parseISO(s.start);
      const diff = Math.floor((d.getTime() - start.getTime()) / 86400000);
      if (diff >= 0 && diff < 7) totals[diff] += shiftMinutes(s);
    });
    return days.map((d, i) => ({ day: d, mins: totals[i] }));
  }, [myShifts]);

  const maxMins = Math.max(60, ...dailyMins.map((d) => d.mins));
  const myAbsences = absences.filter((a) => a.userId === currentUserId);
  const usedDays = myAbsences.filter((a) => a.consumesVacation && a.status === "approved").length;
  const availableDays = me.vacationDaysTotal - usedDays;

  return (
    <>
      <AppHeader title="Inicio" />
      <main className="flex-1 space-y-6 p-6">
        {/* Top welcome + clock */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-xl font-semibold text-primary-foreground">
                {me.name.charAt(0)}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">¡Bienvenido/a!</p>
                <h2 className="text-lg font-semibold">{me.name}</h2>
                <p className="text-xs text-muted-foreground">{me.department} · {me.email}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
              <div>
                <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Clock className="h-4 w-4" /> Tu Tempo
                </p>
                <h2 className="mt-1 text-2xl font-semibold">
                  {active ? "Jornada en curso" : "Listo para empezar"}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {active
                    ? `Comenzaste a las ${format(parseISO(active.start), "HH:mm")}`
                    : "Pulsa para fichar tu entrada."}
                </p>
              </div>
              {active ? (
                <Button
                  size="lg"
                  variant="destructive"
                  onClick={() => {
                    endShift(currentUserId);
                    toast.success("Jornada finalizada");
                  }}
                >
                  <Square className="mr-2 h-4 w-4" /> Finalizar jornada
                </Button>
              ) : (
                <Button
                  size="lg"
                  onClick={() => {
                    startShift(currentUserId);
                    toast.success("Jornada iniciada");
                  }}
                >
                  <Play className="mr-2 h-4 w-4" /> Comenzar jornada
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Stats row */}
        <div className="grid gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Tus horas trabajadas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold tracking-tight">{formatDuration(weekTotal)}</p>
              <p className="text-xs text-muted-foreground">esta semana · objetivo {me.weeklyHours}h</p>
              <div className="mt-6 flex items-end gap-2 h-32">
                {dailyMins.map((d) => (
                  <div key={d.day} className="flex flex-1 flex-col items-center gap-2">
                    <div className="flex w-full flex-1 items-end">
                      <div
                        className="w-full rounded-t bg-primary/80 transition-all"
                        style={{ height: `${(d.mins / maxMins) * 100}%`, minHeight: d.mins ? 6 : 2 }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground">{d.day}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Tu última jornada</CardTitle>
            </CardHeader>
            <CardContent>
              {last ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    {format(parseISO(last.start), "d 'de' MMMM yyyy", { locale: es })}
                  </p>
                  <div className="mt-4 space-y-3">
                    <Row icon="→" label="Comienzo jornada" value={format(parseISO(last.start), "HH:mm")} />
                    <Row icon="←" label="Fin jornada" value={format(parseISO(last.end!), "HH:mm")} />
                    <Row icon="∑" label="Total" value={formatDuration(shiftMinutes(last))} />
                  </div>
                </>
              ) : (
                <p className="py-12 text-center text-sm text-muted-foreground">Aún no tienes jornadas</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Tus ausencias</CardTitle>
              <Plane className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold tracking-tight">{availableDays}</p>
              <p className="text-xs text-muted-foreground">días de vacaciones disponibles</p>
              <div className="mt-6 space-y-2">
                {myAbsences.slice(0, 3).map((a) => (
                  <div key={a.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                    <span>{a.reason}</span>
                    <span className="text-xs text-muted-foreground">
                      {format(parseISO(a.startDate), "d MMM", { locale: es })}
                    </span>
                  </div>
                ))}
                {myAbsences.length === 0 && (
                  <p className="py-8 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
                    <Calendar className="h-6 w-6 opacity-40" />
                    No tienes ausencias
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}

function Row({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-primary">{icon}</span>
        <span>{label}</span>
      </div>
      <span className="text-sm font-medium tabular-nums">{value}</span>
    </div>
  );
}
