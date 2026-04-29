import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { AppHeader } from "@/components/AppHeader";
import { ShiftsCalendar } from "@/components/ShiftsCalendar";
import { ShiftFormDialog } from "@/components/ShiftFormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useAppStore, shiftMinutes, formatDuration, type Shift } from "@/lib/store";
import { Plus, Trash2, Pencil, Layers, Search } from "lucide-react";
import { format, parseISO, eachDayOfInterval } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/jornadas")({
  head: () => ({
    meta: [
      { title: "Jornadas — Tempo" },
      { name: "description", content: "Listado, edición, creación manual y carga en lote de jornadas." },
    ],
  }),
  component: JornadasPage,
});

function JornadasPage() {
  const { shifts, users, addShift, addShiftsBulk, updateShift, deleteShift } = useAppStore();
  const [search, setSearch] = useState("");
  const [userFilter, setUserFilter] = useState<string>("all");
  const [editing, setEditing] = useState<Shift | null>(null);
  const [openNew, setOpenNew] = useState(false);
  const [openBulk, setOpenBulk] = useState(false);

  const filtered = useMemo(() => {
    return shifts
      .filter((s) => userFilter === "all" || s.userId === userFilter)
      .filter((s) => {
        if (!search) return true;
        const u = users.find((x) => x.id === s.userId);
        return `${u?.name ?? ""} ${u?.email ?? ""}`.toLowerCase().includes(search.toLowerCase());
      })
      .sort((a, b) => b.start.localeCompare(a.start));
  }, [shifts, search, userFilter, users]);

  return (
    <>
      <AppHeader title="Jornadas" />
      <main className="flex-1 space-y-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <Dialog open={openNew} onOpenChange={setOpenNew}>
              <DialogTrigger asChild>
                <Button><Plus className="mr-2 h-4 w-4" /> Nueva jornada</Button>
              </DialogTrigger>
              <ShiftFormDialog
                onClose={() => setOpenNew(false)}
                onSave={(s) => { addShift(s); toast.success("Jornada añadida"); }}
              />
            </Dialog>

            <Dialog open={openBulk} onOpenChange={setOpenBulk}>
              <DialogTrigger asChild>
                <Button variant="outline"><Layers className="mr-2 h-4 w-4" /> Añadir en lote</Button>
              </DialogTrigger>
              <BulkDialog
                onClose={() => setOpenBulk(false)}
                onSave={(arr) => { addShiftsBulk(arr); toast.success(`${arr.length} jornadas añadidas`); }}
              />
            </Dialog>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar empleado..."
                className="pl-8 w-[220px]"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los usuarios</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs defaultValue="calendar">
          <TabsList>
            <TabsTrigger value="calendar">Calendario</TabsTrigger>
            <TabsTrigger value="list">Listado</TabsTrigger>
          </TabsList>

          <TabsContent value="calendar" className="mt-4">
            <ShiftsCalendar userId={userFilter === "all" ? undefined : userFilter} />
          </TabsContent>

          <TabsContent value="list" className="mt-4">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Inicio</TableHead>
                    <TableHead>Fin</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Observaciones</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="py-12 text-center text-sm text-muted-foreground">
                        No hay jornadas registradas todavía.
                      </TableCell>
                    </TableRow>
                  )}
                  {filtered.map((s) => {
                    const u = users.find((x) => x.id === s.userId);
                    return (
                      <TableRow key={s.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                              {u?.name.charAt(0)}
                            </div>
                            <span className="text-sm">{u?.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={s.status === "finished" ? "secondary" : "default"} className={s.status === "in_progress" ? "bg-warning text-warning-foreground" : ""}>
                            {s.status === "finished" ? "Finalizada" : "En curso"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm tabular-nums">{format(parseISO(s.start), "dd/MM/yyyy")}</TableCell>
                        <TableCell className="text-sm tabular-nums">{format(parseISO(s.start), "HH:mm")}</TableCell>
                        <TableCell className="text-sm tabular-nums">{s.end ? format(parseISO(s.end), "HH:mm") : "—"}</TableCell>
                        <TableCell className="text-sm font-medium tabular-nums">{formatDuration(shiftMinutes(s))}</TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{s.notes || "—"}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => setEditing(s)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => { deleteShift(s.id); toast.success("Jornada eliminada"); }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        {editing && (
          <ShiftFormDialog
            initial={editing}
            onClose={() => setEditing(null)}
            onSave={(s) => { updateShift(editing.id, s); toast.success("Jornada actualizada"); }}
            onDelete={() => { deleteShift(editing.id); toast.success("Jornada eliminada"); setEditing(null); }}
          />
        )}
      </Dialog>
    </>
  );
}

function BulkDialog({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (s: Omit<Shift, "id">[]) => void;
}) {
  const { users, currentUserId } = useAppStore();
  const [userId, setUserId] = useState(currentUserId);
  const [from, setFrom] = useState(new Date().toISOString().slice(0, 10));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [startT, setStartT] = useState("09:00");
  const [endT, setEndT] = useState("17:00");
  const [skipWeekends, setSkipWeekends] = useState(true);

  const submit = () => {
    const days = eachDayOfInterval({ start: parseISO(from), end: parseISO(to) });
    const arr = days
      .filter((d) => !skipWeekends || (d.getDay() !== 0 && d.getDay() !== 6))
      .map((d) => {
        const date = format(d, "yyyy-MM-dd");
        return {
          userId,
          date,
          start: new Date(`${date}T${startT}:00`).toISOString(),
          end: new Date(`${date}T${endT}:00`).toISOString(),
          status: "finished" as const,
        };
      });
    if (arr.length === 0) {
      toast.error("Ningún día seleccionado");
      return;
    }
    onSave(arr);
    onClose();
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Añadir jornadas en lote</DialogTitle>
        <DialogDescription>Crea varias jornadas de una sola vez para un rango de fechas.</DialogDescription>
      </DialogHeader>
      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label>Usuario</Label>
          <Select value={userId} onValueChange={setUserId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label>Desde</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Hasta</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label>Hora inicio</Label>
            <Input type="time" value={startT} onChange={(e) => setStartT(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Hora fin</Label>
            <Input type="time" value={endT} onChange={(e) => setEndT(e.target.value)} />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={skipWeekends} onChange={(e) => setSkipWeekends(e.target.checked)} />
          Excluir fines de semana
        </label>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={submit}>Crear jornadas</Button>
      </DialogFooter>
    </DialogContent>
  );
}
