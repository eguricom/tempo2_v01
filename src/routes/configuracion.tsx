import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppStore, type WeeklySchedule } from "@/lib/store";
import { WeeklyScheduleEditor } from "@/components/WeeklyScheduleEditor";
import { Plus, Trash2, Wand2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/configuracion")({
  head: () => ({
    meta: [
      { title: "Configuración — Tempo" },
      { name: "description", content: "Configura horas, contrato, vacaciones y departamentos." },
    ],
  }),
  component: ConfigPage,
});

const dayNames = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];

function ConfigPage() {
  const {
    config,
    updateConfig,
    departments,
    addDepartment,
    deleteDepartment,
    users,
    currentUserId,
    updateUser,
    autoFillShifts,
    devMode,
  } = useAppStore();
  const me = users.find((u) => u.id === currentUserId);
  const [newDept, setNewDept] = useState("");
  const [newColor, setNewColor] = useState("#93c5fd");

  const today = new Date().toISOString().slice(0, 10);
  const [rangeFrom, setRangeFrom] = useState("");
  const [rangeTo, setRangeTo] = useState(today);
  const [autoFrom, setAutoFrom] = useState("");

  const toggleDay = (i: number) => {
    const set = new Set(config.workDays);
    if (set.has(i)) set.delete(i);
    else set.add(i);
    updateConfig({ workDays: Array.from(set).sort() });
  };

  const updateMySchedule = (schedule: WeeklySchedule) => {
    if (!me) return;
    updateUser(me.id, { schedule });
  };

  const runFill = (from: string, to: string) => {
    if (!me) return;
    if (!from || !to) {
      toast.error("Selecciona las fechas");
      return;
    }
    if (from > to) {
      toast.error("La fecha inicial debe ser anterior a la final");
      return;
    }
    const n = autoFillShifts(me.id, from, to);
    if (n === 0) toast.info("No había huecos que rellenar en ese rango");
    else toast.success(`${n} jornada${n === 1 ? "" : "s"} autocompletada${n === 1 ? "" : "s"}`);
  };

  return (
    <>
      <AppHeader title="Configuración" />
      <main className="flex-1 space-y-6 p-6">
        {me && (
          <Card>
            <CardHeader>
              <CardTitle>Mi horario laboral</CardTitle>
              <p className="text-sm text-muted-foreground">
                Define las franjas que sueles trabajar cada día. Servirán para autorrellenar fichajes olvidados.
              </p>
            </CardHeader>
            <CardContent>
              <WeeklyScheduleEditor value={me.schedule} onChange={updateMySchedule} />
            </CardContent>
          </Card>
        )}

        {me && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wand2 className="h-4 w-4" /> Rellenar fichajes olvidados
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Crea automáticamente las jornadas que faltan según tu horario. Solo rellena los días sin jornada existente.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
                <div className="grid gap-2">
                  <Label>Desde</Label>
                  <Input type="date" value={rangeFrom} onChange={(e) => setRangeFrom(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label>Hasta</Label>
                  <Input type="date" value={rangeTo} onChange={(e) => setRangeTo(e.target.value)} />
                </div>
                <Button
                  disabled={!devMode}
                  title={!devMode ? "Activa el modo desarrollador" : undefined}
                  onClick={() => runFill(rangeFrom, rangeTo)}
                >
                  Rellenar rango
                </Button>
              </div>

              <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                <div className="grid gap-2">
                  <Label>Automático desde una fecha hasta hoy</Label>
                  <Input type="date" value={autoFrom} onChange={(e) => setAutoFrom(e.target.value)} />
                </div>
                <Button
                  variant="outline"
                  disabled={!devMode}
                  title={!devMode ? "Activa el modo desarrollador" : undefined}
                  onClick={() => runFill(autoFrom, today)}
                >
                  Rellenar hasta hoy
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Configuración de la empresa</CardTitle>
            <p className="text-sm text-muted-foreground">Define la configuración por defecto para tus usuarios.</p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Horas semanales</Label>
                <Input type="number" value={config.weeklyHours} onChange={(e) => updateConfig({ weeklyHours: +e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Horas anuales</Label>
                <Input type="number" value={config.annualHours} onChange={(e) => updateConfig({ annualHours: +e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Tipo de contrato</Label>
                <Select value={config.contractType} onValueChange={(v) => updateConfig({ contractType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Jornada completa">Jornada completa</SelectItem>
                    <SelectItem value="Media jornada">Media jornada</SelectItem>
                    <SelectItem value="Por horas">Por horas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Días de vacaciones anuales</Label>
                <Input type="number" value={config.vacationDays} onChange={(e) => updateConfig({ vacationDays: +e.target.value })} />
              </div>
              <div className="grid gap-2 md:col-span-2">
                <Label>Días que trabaja</Label>
                <div className="flex gap-2">
                  {dayNames.map((d, i) => {
                    const active = config.workDays.includes(i);
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => toggleDay(i)}
                        className={`h-9 w-9 rounded-md border text-sm font-medium transition-colors ${
                          active ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted"
                        }`}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <Button onClick={() => toast.success("Cambios guardados")}>Guardar cambios</Button>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="departments">
          <TabsList>
            <TabsTrigger value="departments">Departamentos</TabsTrigger>
            <TabsTrigger value="absence-types">Tipos de ausencia</TabsTrigger>
            <TabsTrigger value="other">Otras configuraciones</TabsTrigger>
          </TabsList>
          <TabsContent value="departments">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Departamentos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex flex-wrap items-end gap-3">
                  <div className="grid gap-2">
                    <Label>Nombre</Label>
                    <Input value={newDept} onChange={(e) => setNewDept(e.target.value)} placeholder="p. ej. Marketing" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Color</Label>
                    <Input type="color" value={newColor} onChange={(e) => setNewColor(e.target.value)} className="w-20 p-1" />
                  </div>
                  <Button
                    onClick={() => {
                      if (!newDept.trim()) return;
                      addDepartment({ name: newDept.trim(), color: newColor });
                      setNewDept("");
                      toast.success("Departamento añadido");
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" /> Añadir
                  </Button>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Color</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {departments.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell><div className="h-5 w-5 rounded-full" style={{ background: d.color }} /></TableCell>
                        <TableCell className="text-sm">{d.name}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => { deleteDepartment(d.id); toast.success("Eliminado"); }}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="absence-types">
            <Card><CardContent className="p-12 text-center text-sm text-muted-foreground">Próximamente</CardContent></Card>
          </TabsContent>
          <TabsContent value="other">
            <Card><CardContent className="p-12 text-center text-sm text-muted-foreground">Próximamente</CardContent></Card>
          </TabsContent>
        </Tabs>
      </main>
    </>
  );
}
