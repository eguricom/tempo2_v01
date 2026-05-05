import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { AppHeader } from "@/components/AppHeader";
import { ShiftsCalendar } from "@/components/ShiftsCalendar";
import { ShiftFormDialog } from "@/components/ShiftFormDialog";
import { BulkShiftDialog } from "@/components/BulkShiftDialog";
import { BulkEditDialog } from "@/components/BulkEditDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useAppStore, shiftMinutes, formatDuration, type Shift } from "@/lib/store";
import { Plus, Trash2, Pencil, Layers, Search, Printer, Download, FileSpreadsheet, FileText, Sparkles } from "lucide-react";
import { format, parseISO, startOfWeek, endOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { exportShiftsExcel, exportShiftsPDF } from "@/lib/export";
import { groupShiftsByPeriod, magicBalanceWeek } from "@/lib/balance";

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
  const { shifts, users, addShift, addShiftsBulk, updateShift, deleteShift, devMode, currentUserId } = useAppStore();
  const [search, setSearch] = useState("");
  const [userFilter, setUserFilter] = useState<string>("all");
  const [groupBy, setGroupBy] = useState<"none" | "week" | "month" | "year">("none");
  const [editing, setEditing] = useState<Shift | null>(null);
  const [openNew, setOpenNew] = useState(false);
  const [openBulk, setOpenBulk] = useState(false);
  const [openBulkEdit, setOpenBulkEdit] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

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

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((s) => s.id)));
  };
  const clearSelection = () => setSelected(new Set());

  const bulkDelete = () => {
    selected.forEach((id) => deleteShift(id));
    toast.success(`${selected.size} jornadas eliminadas`);
    clearSelection();
  };

  const exportData = () => filtered.filter((s) => selected.size === 0 || selected.has(s.id));

  const grouped = useMemo(() => {
    if (groupBy === "none") return null;
    const map = groupShiftsByPeriod(filtered, groupBy);
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered, groupBy]);

  const formatGroupLabel = (key: string) => {
    if (groupBy === "year") return key;
    if (groupBy === "month") {
      const [y, m] = key.split("-");
      return format(new Date(+y, +m - 1, 1), "MMMM yyyy", { locale: es });
    }
    // week: yyyy-Www -> show first shift's week range
    return `Semana ${key}`;
  };

  const runMagicBalance = () => {
    if (userFilter === "all") {
      toast.error("Selecciona un usuario para cuadrar las horas");
      return;
    }
    const user = users.find((u) => u.id === userFilter);
    if (!user) return;
    const now = new Date();
    const ws = startOfWeek(now, { weekStartsOn: 1 });
    const we = endOfWeek(now, { weekStartsOn: 1 });
    const weekShifts = shifts.filter((s) => {
      if (s.userId !== userFilter) return false;
      const d = parseISO(s.start);
      return d >= ws && d <= we;
    });
    if (weekShifts.length === 0) {
      toast.error("No hay jornadas esta semana para cuadrar");
      return;
    }
    const result = magicBalanceWeek(user, weekShifts);
    if (result.changed.length === 0) {
      toast.info(`Ya cuadrado: ${(result.totalBefore / 60).toFixed(2)}h`);
      return;
    }
    result.changed.forEach((c) => {
      updateShift(c.id, { segments: c.segments, start: c.start, end: c.end, status: "finished" });
    });
    toast.success(
      `Semana cuadrada: ${(result.totalBefore / 60).toFixed(2)}h → ${(result.totalAfter / 60).toFixed(2)}h`,
    );
  };

  return (
    <>
      <AppHeader title="Jornadas" />
      <main className="flex-1 space-y-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 no-print">
          <div className="flex flex-wrap gap-2">
            <Dialog open={openNew} onOpenChange={(o) => devMode && setOpenNew(o)}>
              <DialogTrigger asChild>
                <Button disabled={!devMode} title={!devMode ? "Activa el modo desarrollador" : undefined}>
                  <Plus className="mr-2 h-4 w-4" /> Nueva jornada
                </Button>
              </DialogTrigger>
              <ShiftFormDialog
                onClose={() => setOpenNew(false)}
                onSave={(s) => { addShift(s); toast.success("Jornada añadida"); }}
              />
            </Dialog>

            <Dialog open={openBulk} onOpenChange={(o) => devMode && setOpenBulk(o)}>
              <DialogTrigger asChild>
                <Button variant="outline" disabled={!devMode} title={!devMode ? "Activa el modo desarrollador" : undefined}>
                  <Layers className="mr-2 h-4 w-4" /> Añadir en lote
                </Button>
              </DialogTrigger>
              <BulkShiftDialog
                onClose={() => setOpenBulk(false)}
                onSave={(arr) => { addShiftsBulk(arr); toast.success(`${arr.length} jornadas añadidas`); }}
              />
            </Dialog>

            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" /> Imprimir
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Download className="mr-2 h-4 w-4" /> Exportar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => exportShiftsExcel(exportData(), users)}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" /> Exportar Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportShiftsPDF(exportData(), users)}>
                  <FileText className="mr-2 h-4 w-4" /> Exportar PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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

          <TabsContent value="list" className="mt-4 space-y-3">
            {selected.size > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/40 px-3 py-2 no-print">
                <span className="text-sm font-medium">{selected.size} seleccionadas</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setOpenBulkEdit(true)} disabled={!devMode}>
                    <Pencil className="mr-2 h-4 w-4" /> Editar en lote
                  </Button>
                  <Button size="sm" variant="outline" onClick={bulkDelete} disabled={!devMode}>
                    <Trash2 className="mr-2 h-4 w-4 text-destructive" /> Eliminar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={clearSelection}>Cancelar</Button>
                </div>
              </div>
            )}
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={filtered.length > 0 && selected.size === filtered.length}
                        onCheckedChange={toggleAll}
                        disabled={!devMode}
                      />
                    </TableHead>
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
                      <TableCell colSpan={9} className="py-12 text-center text-sm text-muted-foreground">
                        No hay jornadas registradas todavía.
                      </TableCell>
                    </TableRow>
                  )}
                  {filtered.map((s) => {
                    const u = users.find((x) => x.id === s.userId);
                    const editable = devMode || (s.status === "in_progress" && s.userId === currentUserId);
                    return (
                      <TableRow key={s.id} data-state={selected.has(s.id) ? "selected" : undefined}>
                        <TableCell>
                          <Checkbox
                            checked={selected.has(s.id)}
                            onCheckedChange={() => toggleOne(s.id)}
                            disabled={!devMode}
                          />
                        </TableCell>
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
                          <Button variant="ghost" size="icon" disabled={!editable} onClick={() => setEditing(s)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={!devMode}
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

      <Dialog open={openBulkEdit} onOpenChange={setOpenBulkEdit}>
        <BulkEditDialog
          count={selected.size}
          onClose={() => setOpenBulkEdit(false)}
          onApply={(patch) => {
            selected.forEach((id) => {
              const sh = shifts.find((x) => x.id === id);
              if (!sh) return;
              const update: Partial<Shift> = { ...patch };
              if (patch.segments) {
                const date = sh.date;
                const ordered = patch.segments;
                update.segments = ordered.map((seg) => ({ ...seg, id: Math.random().toString(36).slice(2, 10) }));
                update.start = new Date(`${date}T${ordered[0].start}:00`).toISOString();
                update.end = new Date(`${date}T${ordered[ordered.length - 1].end}:00`).toISOString();
                update.status = "finished";
              }
              updateShift(id, update);
            });
            toast.success(`${selected.size} jornadas actualizadas`);
            clearSelection();
          }}
        />
      </Dialog>
    </>
  );
}
