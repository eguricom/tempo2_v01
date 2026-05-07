import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { AppHeader } from "@/components/AppHeader";
import { ShiftsCalendar } from "@/components/ShiftsCalendar";
import { ShiftFormDialog } from "@/components/ShiftFormDialog";
import { BulkShiftDialog } from "@/components/BulkShiftDialog";
import { BulkEditDialog } from "@/components/BulkEditDialog";
import { JornadasWeekView } from "@/components/JornadasWeekView";
import { SegmentChips } from "@/components/SegmentChips";
import { PrintReportDialog } from "@/components/PrintReportDialog";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
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
import { useAppStore, shiftMinutes, formatDuration, canEditShiftDate, type Shift, type ShiftSegment } from "@/lib/store";
import { magicBalanceWeek } from "@/lib/balance";
import { startOfWeek, format as fmt, parseISO } from "date-fns";
import { Plus, Trash2, Pencil, Layers, Search, Printer, Download, FileSpreadsheet, FileText, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { exportShiftsExcel, exportShiftsPDF } from "@/lib/export";

export const Route = createFileRoute("/jornadas")({
  head: () => ({
    meta: [
      { title: "Jornadas — Tempo" },
      { name: "description", content: "Listado, edición, creación manual y carga en lote de jornadas." },
    ],
  }),
  component: JornadasPage,
});

const LIST_PAGE = 30;

function JornadasPage() {
  const { shifts, users, addShift, addShiftsBulk, updateShift, deleteShift, devMode, currentUserId } = useAppStore();
  const [search, setSearch] = useState("");
  const [userFilter, setUserFilter] = useState<string>("all");
  const [editing, setEditing] = useState<Shift | null>(null);
  const [openNew, setOpenNew] = useState(false);
  const [openBulk, setOpenBulk] = useState(false);
  const [openBulkEdit, setOpenBulkEdit] = useState(false);
  const [openPrint, setOpenPrint] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [listPage, setListPage] = useState(LIST_PAGE);
  const [magicJitter] = useState(15);

  const filteredAll = useMemo(() => {
    return shifts
      .filter((s) => userFilter === "all" || s.userId === userFilter)
      .filter((s) => {
        if (!search) return true;
        const u = users.find((x) => x.id === s.userId);
        return `${u?.name ?? ""} ${u?.lastName ?? ""} ${u?.email ?? ""}`.toLowerCase().includes(search.toLowerCase());
      })
      .sort((a, b) => b.start.localeCompare(a.start));
  }, [shifts, search, userFilter, users]);

  const filtered = filteredAll.slice(0, listPage);

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

  const exportData = () => filteredAll.filter((s) => selected.size === 0 || selected.has(s.id));

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

  const runMagicForShift = (sh: Shift) => {
    if (!devMode) return;
    const user = users.find((u) => u.id === sh.userId);
    if (!user) return;
    const wkStart = startOfWeek(parseISO(sh.start), { weekStartsOn: 1 });
    const wkKey = fmt(wkStart, "yyyy-MM-dd");
    const weekShifts = shifts.filter((x) => x.userId === sh.userId && fmt(startOfWeek(parseISO(x.start), { weekStartsOn: 1 }), "yyyy-MM-dd") === wkKey);
    const result = magicBalanceWeek(user, weekShifts, { jitterMin: magicJitter, totalJitterMin: 30 });
    result.changed.forEach((c) => updateShift(c.id, { segments: c.segments, start: c.start, end: c.end, status: "finished" }));
    toast.success(`Semana cuadrada: ${(result.totalAfter / 60).toFixed(2)}h`);
  };

  return (
    <>
      <AppHeader title="Jornadas" />
      <main className="flex-1 space-y-4 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 no-print">
          <div className="flex flex-wrap gap-2">
            <Dialog open={openNew} onOpenChange={setOpenNew}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" /> Nueva jornada
                </Button>
              </DialogTrigger>
              <ShiftFormDialog
                onClose={() => setOpenNew(false)}
                onSave={(s) => { addShift(s); toast.success("Jornada añadida"); }}
              />
            </Dialog>

            {devMode && (
              <Dialog open={openBulk} onOpenChange={setOpenBulk}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Layers className="mr-2 h-4 w-4" /> Añadir en lote
                  </Button>
                </DialogTrigger>
                <BulkShiftDialog
                  onClose={() => setOpenBulk(false)}
                  onSave={(arr) => { addShiftsBulk(arr); toast.success(`${arr.length} jornadas añadidas`); }}
                />
              </Dialog>
            )}

            <Dialog open={openPrint} onOpenChange={setOpenPrint}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Printer className="mr-2 h-4 w-4" /> Imprimir
                </Button>
              </DialogTrigger>
              {openPrint && <PrintReportDialog onClose={() => setOpenPrint(false)} />}
            </Dialog>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
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
                className="pl-8 w-full sm:w-[200px]"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger className="w-full sm:w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los usuarios</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.name} {u.lastName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs defaultValue="week">
          <TabsList>
            <TabsTrigger value="week">Semana</TabsTrigger>
            <TabsTrigger value="month">Mes</TabsTrigger>
            <TabsTrigger value="list">Diario</TabsTrigger>
          </TabsList>

          <TabsContent value="week" className="mt-4">
            <JornadasWeekView userId={userFilter === "all" ? undefined : userFilter} />
          </TabsContent>

          <TabsContent value="month" className="mt-4">
            <ShiftsCalendar userId={userFilter === "all" ? undefined : userFilter} />
          </TabsContent>

          <TabsContent value="list" className="mt-4 space-y-3">
            {selected.size > 0 && devMode && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/40 px-3 py-2 no-print">
                <span className="text-sm font-medium">{selected.size} seleccionadas</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setOpenBulkEdit(true)}>
                    <Pencil className="mr-2 h-4 w-4" /> Editar en lote
                  </Button>
                  <Button size="sm" variant="outline" onClick={bulkDelete}>
                    <Trash2 className="mr-2 h-4 w-4 text-destructive" /> Eliminar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={clearSelection}>Cancelar</Button>
                </div>
              </div>
            )}
            <Card className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {devMode && (
                      <TableHead className="w-10">
                        <Checkbox
                          checked={filtered.length > 0 && selected.size === filtered.length}
                          onCheckedChange={toggleAll}
                        />
                      </TableHead>
                    )}
                    <TableHead>Usuario</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Franjas</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={devMode ? 7 : 6} className="py-12 text-center text-sm text-muted-foreground">
                        No hay jornadas registradas todavía.
                      </TableCell>
                    </TableRow>
                  )}
                  {filtered.map((s) => {
                    const u = users.find((x) => x.id === s.userId);
                    const editable = canEditShiftDate(s.date, devMode) || (s.status === "in_progress" && s.userId === currentUserId);
                    return (
                      <TableRow key={s.id} data-state={selected.has(s.id) ? "selected" : undefined}>
                        {devMode && (
                          <TableCell>
                            <Checkbox
                              checked={selected.has(s.id)}
                              onCheckedChange={() => toggleOne(s.id)}
                            />
                          </TableCell>
                        )}
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-7 w-7" style={u?.avatarColor ? { backgroundColor: u.avatarColor } : undefined}>
                              {u?.avatar && <AvatarImage src={u.avatar} alt={u.name} />}
                              <AvatarFallback className="text-xs text-white" style={{ backgroundColor: u?.avatarColor ?? "hsl(var(--primary))" }}>{u?.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{u?.name} {u?.lastName}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={s.status === "finished" ? "secondary" : "default"} className={s.status === "in_progress" ? "bg-warning text-warning-foreground" : ""}>
                            {s.status === "finished" ? "Finalizada" : "En curso"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm tabular-nums">{format(parseISO(s.start), "dd/MM/yyyy")}</TableCell>
                        <TableCell>
                          <SegmentChips
                            segments={s.segments}
                            onSegmentChange={editable ? (id, patch) => editSegment(s, id, patch) : undefined}
                          />
                        </TableCell>
                        <TableCell className="text-sm font-medium tabular-nums">{formatDuration(shiftMinutes(s))}</TableCell>
                        <TableCell className="text-right">
                          {devMode && (
                            <Button variant="ghost" size="icon" onClick={() => runMagicForShift(s)} title="Cuadre mágico de la semana">
                              <Sparkles className="h-4 w-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" disabled={!editable} onClick={() => setEditing(s)}
                            title={!editable ? "Fuera del rango editable (7 días)" : undefined}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {devMode && (
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={!editable}
                              onClick={() => { deleteShift(s.id); toast.success("Jornada eliminada"); }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
            {listPage < filteredAll.length && (
              <div className="flex justify-center pt-2 no-print">
                <Button variant="outline" size="sm" onClick={() => setListPage((c) => c + LIST_PAGE)}>
                  Cargar {Math.min(LIST_PAGE, filteredAll.length - listPage)} jornadas más
                </Button>
              </div>
            )}
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
