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
import { useAppStore } from "@/lib/store";
import { Plus, Trash2 } from "lucide-react";
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
  const { config, updateConfig, departments, addDepartment, deleteDepartment } = useAppStore();
  const [newDept, setNewDept] = useState("");
  const [newColor, setNewColor] = useState("#93c5fd");

  const toggleDay = (i: number) => {
    const set = new Set(config.workDays);
    set.has(i) ? set.delete(i) : set.add(i);
    updateConfig({ workDays: Array.from(set).sort() });
  };

  return (
    <>
      <AppHeader title="Configuración" />
      <main className="flex-1 space-y-6 p-6">
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
