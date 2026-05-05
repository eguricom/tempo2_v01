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
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

export const Route = createFileRoute("/vacaciones")({
  head: () => ({
    meta: [
      { title: "Vacaciones y festivos — Tempo" },
      { name: "description", content: "Gestiona festivos, vacaciones y días libres del equipo." },
    ],
  }),
  component: VacacionesPage,
});

function VacacionesPage() {
  const {
    holidays, addHoliday, deleteHoliday,
    vacations, addVacation, deleteVacation,
    freeDays, addFreeDay, deleteFreeDay,
    users, currentUserId, devMode,
  } = useAppStore();

  const [hDate, setHDate] = useState("");
  const [hName, setHName] = useState("");

  const [vUser, setVUser] = useState(currentUserId);
  const [vFrom, setVFrom] = useState("");
  const [vTo, setVTo] = useState("");
  const [vNotes, setVNotes] = useState("");

  const [fUser, setFUser] = useState(currentUserId);
  const [fDate, setFDate] = useState("");
  const [fNotes, setFNotes] = useState("");

  return (
    <>
      <AppHeader title="Vacaciones, festivos y días libres" />
      <main className="flex-1 space-y-4 p-6">
        <Tabs defaultValue="holidays">
          <TabsList>
            <TabsTrigger value="holidays">Festivos</TabsTrigger>
            <TabsTrigger value="vacations">Vacaciones</TabsTrigger>
            <TabsTrigger value="free">Días libres</TabsTrigger>
          </TabsList>

          <TabsContent value="holidays" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Festivos anuales (toda la empresa)</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Los festivos aplican a todos los trabajadores y bloquean los fichajes en lote.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="grid gap-2"><Label>Fecha</Label><Input type="date" value={hDate} onChange={(e) => setHDate(e.target.value)} /></div>
                  <div className="grid gap-2 flex-1 min-w-[200px]"><Label>Nombre</Label><Input value={hName} onChange={(e) => setHName(e.target.value)} placeholder="p. ej. Día de la Hispanidad" /></div>
                  <Button
                    disabled={!devMode}
                    onClick={() => {
                      if (!hDate || !hName.trim()) { toast.error("Completa fecha y nombre"); return; }
                      addHoliday({ date: hDate, name: hName.trim() });
                      setHDate(""); setHName("");
                      toast.success("Festivo añadido");
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" /> Añadir
                  </Button>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {holidays.length === 0 && (
                      <TableRow><TableCell colSpan={3} className="py-8 text-center text-sm text-muted-foreground">Sin festivos</TableCell></TableRow>
                    )}
                    {[...holidays].sort((a, b) => a.date.localeCompare(b.date)).map((h) => (
                      <TableRow key={h.id}>
                        <TableCell className="text-sm tabular-nums">{format(parseISO(h.date), "dd MMM yyyy", { locale: es })}</TableCell>
                        <TableCell className="text-sm">{h.name}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" disabled={!devMode} onClick={() => { deleteHoliday(h.id); toast.success("Eliminado"); }}>
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

          <TabsContent value="vacations" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Vacaciones del equipo</CardTitle>
                <p className="text-sm text-muted-foreground">Cada usuario añade sus vacaciones; se ven las de todos.</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="grid gap-2 min-w-[180px]">
                    <Label>Usuario</Label>
                    <Select value={vUser} onValueChange={setVUser}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name} {u.lastName}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2"><Label>Desde</Label><Input type="date" value={vFrom} onChange={(e) => setVFrom(e.target.value)} /></div>
                  <div className="grid gap-2"><Label>Hasta</Label><Input type="date" value={vTo} onChange={(e) => setVTo(e.target.value)} /></div>
                  <div className="grid gap-2 flex-1 min-w-[200px]"><Label>Notas</Label><Input value={vNotes} onChange={(e) => setVNotes(e.target.value)} /></div>
                  <Button onClick={() => {
                    if (!vFrom || !vTo) { toast.error("Selecciona el rango"); return; }
                    if (vFrom > vTo) { toast.error("Rango inválido"); return; }
                    addVacation({ userId: vUser, startDate: vFrom, endDate: vTo, notes: vNotes });
                    setVFrom(""); setVTo(""); setVNotes("");
                    toast.success("Vacaciones añadidas");
                  }}>
                    <Plus className="mr-2 h-4 w-4" /> Añadir
                  </Button>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Desde</TableHead>
                      <TableHead>Hasta</TableHead>
                      <TableHead>Notas</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vacations.length === 0 && (
                      <TableRow><TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">Sin vacaciones</TableCell></TableRow>
                    )}
                    {[...vacations].sort((a, b) => a.startDate.localeCompare(b.startDate)).map((v) => {
                      const u = users.find((x) => x.id === v.userId);
                      return (
                        <TableRow key={v.id}>
                          <TableCell className="text-sm">{u ? `${u.name} ${u.lastName}` : "—"}</TableCell>
                          <TableCell className="text-sm tabular-nums">{format(parseISO(v.startDate), "dd/MM/yyyy")}</TableCell>
                          <TableCell className="text-sm tabular-nums">{format(parseISO(v.endDate), "dd/MM/yyyy")}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{v.notes || "—"}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => { deleteVacation(v.id); toast.success("Eliminado"); }}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="free" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Días libres del equipo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="grid gap-2 min-w-[180px]">
                    <Label>Usuario</Label>
                    <Select value={fUser} onValueChange={setFUser}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name} {u.lastName}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2"><Label>Fecha</Label><Input type="date" value={fDate} onChange={(e) => setFDate(e.target.value)} /></div>
                  <div className="grid gap-2 flex-1 min-w-[200px]"><Label>Notas</Label><Input value={fNotes} onChange={(e) => setFNotes(e.target.value)} /></div>
                  <Button onClick={() => {
                    if (!fDate) { toast.error("Selecciona una fecha"); return; }
                    addFreeDay({ userId: fUser, date: fDate, notes: fNotes });
                    setFDate(""); setFNotes("");
                    toast.success("Día libre añadido");
                  }}>
                    <Plus className="mr-2 h-4 w-4" /> Añadir
                  </Button>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Notas</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {freeDays.length === 0 && (
                      <TableRow><TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">Sin días libres</TableCell></TableRow>
                    )}
                    {[...freeDays].sort((a, b) => a.date.localeCompare(b.date)).map((f) => {
                      const u = users.find((x) => x.id === f.userId);
                      return (
                        <TableRow key={f.id}>
                          <TableCell className="text-sm">{u ? `${u.name} ${u.lastName}` : "—"}</TableCell>
                          <TableCell className="text-sm tabular-nums">{format(parseISO(f.date), "dd/MM/yyyy")}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{f.notes || "—"}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => { deleteFreeDay(f.id); toast.success("Eliminado"); }}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </>
  );
}
