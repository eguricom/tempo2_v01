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
import { useAppStore, type Holiday, type VacationRange } from "@/lib/store";
import { Plus, Trash2, Pencil } from "lucide-react";
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
    holidays, addHoliday, updateHoliday, deleteHoliday,
    vacations, addVacation, updateVacation, deleteVacation,
    freeDays, addFreeDay, deleteFreeDay,
    users, currentUserId, devMode,
  } = useAppStore();

  const [hDate, setHDate] = useState("");
  const [hName, setHName] = useState("");
  const [hScope, setHScope] = useState<"national" | "regional" | "local" | "company">("national");
  const [hColor, setHColor] = useState("#ef4444");
  const [hLabel, setHLabel] = useState("");
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);

  const [vUser, setVUser] = useState(currentUserId);
  const [vFrom, setVFrom] = useState("");
  const [vTo, setVTo] = useState("");
  const [vNotes, setVNotes] = useState("");
  const [vKind, setVKind] = useState<"vacation" | "sick" | "personal" | "other">("vacation");
  const [vColor, setVColor] = useState("#22c55e");
  const [vLabel, setVLabel] = useState("");
  const [editingVacation, setEditingVacation] = useState<VacationRange | null>(null);

  const [fUser, setFUser] = useState(currentUserId);
  const [fDate, setFDate] = useState("");
  const [fNotes, setFNotes] = useState("");

  return (
    <>
      <AppHeader title="Vacaciones, festivos y días libres" />
      <main className="flex-1 space-y-4 py-4 sm:py-6">
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
                <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-end gap-3">
                  <div className="grid gap-2 flex-1"><Label>Fecha</Label><Input type="date" value={hDate} onChange={(e) => setHDate(e.target.value)} /></div>
                  <div className="grid gap-2 flex-[2] min-w-0"><Label>Nombre</Label><Input value={hName} onChange={(e) => setHName(e.target.value)} placeholder="p. ej. Día de la Hispanidad" /></div>
                  <div className="grid gap-2 flex-1 min-w-0">
                    <Label>Ámbito</Label>
                    <Select value={hScope} onValueChange={(v) => setHScope(v as typeof hScope)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="national">Nacional</SelectItem>
                        <SelectItem value="regional">Regional</SelectItem>
                        <SelectItem value="local">Local</SelectItem>
                        <SelectItem value="company">Empresa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2"><Label>Etiqueta</Label><Input value={hLabel} onChange={(e) => setHLabel(e.target.value)} placeholder="Opcional" /></div>
                  <div className="grid gap-2"><Label>Color</Label><Input type="color" value={hColor} onChange={(e) => setHColor(e.target.value)} className="w-full sm:w-16 p-1" /></div>
                  <Button
                    disabled={!devMode}
                    onClick={() => {
                      if (!hDate || !hName.trim()) { toast.error("Completa fecha y nombre"); return; }
                      if (editingHoliday) {
                        updateHoliday(editingHoliday.id, { date: hDate, name: hName.trim(), scope: hScope, color: hColor, label: hLabel.trim() || undefined });
                        setEditingHoliday(null);
                        toast.success("Festivo actualizado");
                      } else {
                        addHoliday({ date: hDate, name: hName.trim(), scope: hScope, color: hColor, label: hLabel.trim() || undefined });
                        toast.success("Festivo añadido");
                      }
                      setHDate(""); setHName(""); setHLabel("");
                    }}
                  >
                    {editingHoliday ? <Pencil className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
                    {editingHoliday ? "Actualizar" : "Añadir"}
                  </Button>
                  {editingHoliday && (
                    <Button variant="ghost" onClick={() => { setEditingHoliday(null); setHDate(""); setHName(""); setHLabel(""); setHScope("national"); setHColor("#ef4444"); }}>
                      Cancelar
                    </Button>
                  )}
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead className="hidden sm:table-cell">Ámbito</TableHead>
                    <TableHead className="hidden sm:table-cell">Etiqueta</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {holidays.length === 0 && (
                      <TableRow><TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">Sin festivos</TableCell></TableRow>
                    )}
                    {[...holidays].sort((a, b) => a.date.localeCompare(b.date)).map((h) => (
                      <TableRow key={h.id}>
                        <TableCell className="text-sm tabular-nums">{format(parseISO(h.date), "dd MMM yyyy", { locale: es })}</TableCell>
                        <TableCell className="text-sm">
                          <span className="inline-flex items-center gap-2">
                            <span className="h-3 w-3 rounded-full border" style={{ backgroundColor: h.color ?? "#ef4444" }} />
                            {h.name}
                          </span>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-xs uppercase text-muted-foreground">{h.scope ?? "national"}</TableCell>
                        <TableCell className="hidden sm:table-cell text-sm">{h.label || "—"}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" disabled={!devMode} onClick={() => { setEditingHoliday(h); setHDate(h.date); setHName(h.name); setHScope(h.scope ?? "national"); setHColor(h.color ?? "#ef4444"); setHLabel(h.label ?? ""); }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
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
                <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-end gap-3">
                  <div className="grid gap-2 flex-1 min-w-0">
                    <Label>Usuario</Label>
                    <Select value={vUser} onValueChange={setVUser}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name} {u.lastName}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2 flex-1"><Label>Desde</Label><Input type="date" value={vFrom} onChange={(e) => setVFrom(e.target.value)} /></div>
                  <div className="grid gap-2 flex-1"><Label>Hasta</Label><Input type="date" value={vTo} onChange={(e) => setVTo(e.target.value)} /></div>
                  <div className="grid gap-2 flex-1 min-w-0">
                    <Label>Tipo</Label>
                    <Select value={vKind} onValueChange={(v) => setVKind(v as typeof vKind)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vacation">Vacaciones</SelectItem>
                        <SelectItem value="sick">Baja</SelectItem>
                        <SelectItem value="personal">Personal</SelectItem>
                        <SelectItem value="other">Otro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2 flex-1"><Label>Etiqueta</Label><Input value={vLabel} onChange={(e) => setVLabel(e.target.value)} placeholder="Opcional" /></div>
                  <div className="grid gap-2"><Label>Color</Label><Input type="color" value={vColor} onChange={(e) => setVColor(e.target.value)} className="w-full sm:w-16 p-1" /></div>
                  <div className="grid gap-2 flex-1 min-w-0"><Label>Notas</Label><Input value={vNotes} onChange={(e) => setVNotes(e.target.value)} /></div>
                  <Button onClick={() => {
                    if (!vFrom || !vTo) { toast.error("Selecciona el rango"); return; }
                    if (vFrom > vTo) { toast.error("Rango inválido"); return; }
                    if (editingVacation) {
                      updateVacation(editingVacation.id, { userId: vUser, startDate: vFrom, endDate: vTo, notes: vNotes, kind: vKind, color: vColor, label: vLabel.trim() || undefined });
                      setEditingVacation(null);
                      toast.success("Vacaciones actualizadas");
                    } else {
                      addVacation({ userId: vUser, startDate: vFrom, endDate: vTo, notes: vNotes, kind: vKind, color: vColor, label: vLabel.trim() || undefined });
                      toast.success("Vacaciones añadidas");
                    }
                    setVFrom(""); setVTo(""); setVNotes(""); setVLabel("");
                  }}>
                    {editingVacation ? <Pencil className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
                    {editingVacation ? "Actualizar" : "Añadir"}
                  </Button>
                  {editingVacation && (
                    <Button variant="ghost" onClick={() => { setEditingVacation(null); setVFrom(""); setVTo(""); setVNotes(""); setVLabel(""); setVKind("vacation"); setVColor("#22c55e"); }}>
                      Cancelar
                    </Button>
                  )}
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead className="hidden sm:table-cell">Tipo</TableHead>
                    <TableHead>Desde</TableHead>
                    <TableHead>Hasta</TableHead>
                    <TableHead className="hidden sm:table-cell">Notas</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vacations.length === 0 && (
                      <TableRow><TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">Sin vacaciones</TableCell></TableRow>
                    )}
                    {[...vacations].sort((a, b) => a.startDate.localeCompare(b.startDate)).map((v) => {
                      const u = users.find((x) => x.id === v.userId);
                      return (
                        <TableRow key={v.id}>
                          <TableCell className="text-sm whitespace-nowrap">{u ? `${u.name} ${u.lastName}` : "—"}</TableCell>
                          <TableCell className="hidden sm:table-cell text-sm">
                            <span className="inline-flex items-center gap-2">
                              <span className="h-3 w-3 rounded-full border" style={{ backgroundColor: v.color ?? "#22c55e" }} />
                              {v.label || v.kind || "vacation"}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm tabular-nums whitespace-nowrap">{format(parseISO(v.startDate), "dd/MM/yyyy")}</TableCell>
                          <TableCell className="text-sm tabular-nums whitespace-nowrap">{format(parseISO(v.endDate), "dd/MM/yyyy")}</TableCell>
                          <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{v.notes || "—"}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => { setEditingVacation(v); setVUser(v.userId); setVFrom(v.startDate); setVTo(v.endDate); setVNotes(v.notes ?? ""); setVKind(v.kind ?? "vacation"); setVColor(v.color ?? "#22c55e"); setVLabel(v.label ?? ""); }}>
                              <Pencil className="h-4 w-4" />
                            </Button>
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
                <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-end gap-3">
                  <div className="grid gap-2 flex-1 min-w-0">
                    <Label>Usuario</Label>
                    <Select value={fUser} onValueChange={setFUser}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name} {u.lastName}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2 flex-1"><Label>Fecha</Label><Input type="date" value={fDate} onChange={(e) => setFDate(e.target.value)} /></div>
                  <div className="grid gap-2 flex-1 min-w-0"><Label>Notas</Label><Input value={fNotes} onChange={(e) => setFNotes(e.target.value)} /></div>
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
                    <TableHead className="hidden sm:table-cell">Notas</TableHead>
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
                          <TableCell className="text-sm whitespace-nowrap">{u ? `${u.name} ${u.lastName}` : "—"}</TableCell>
                          <TableCell className="text-sm tabular-nums whitespace-nowrap">{format(parseISO(f.date), "dd/MM/yyyy")}</TableCell>
                          <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{f.notes || "—"}</TableCell>
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
