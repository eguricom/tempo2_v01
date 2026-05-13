import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAppStore, apiUrl, shiftMinutes, type Shift } from "@/lib/store";
import { exportShiftsExcelMulti, exportShiftsCSV } from "@/lib/export";
import { Download, Upload, RotateCcw, RefreshCw, HardDrive, AlertTriangle, FileText, Table2 } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

export const Route = createFileRoute("/copias-seguridad")({
  head: () => ({
    meta: [
      { title: "Copias de seguridad — Tempo" },
      { name: "description", content: "Gestiona las copias de seguridad de los datos." },
    ],
  }),
  component: CopiasSeguridadPage,
});

interface BackupEntry {
  name: string;
  size: number;
  modified: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function CopiasSeguridadPage() {
  const { devMode, users, shifts, absences, departments, holidays, vacations, freeDays, absenceTypes, companyLogo, config, auditLog, currentUserId } = useAppStore();
  const [backups, setBackups] = useState<BackupEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState<string | null>(null);

  const fetchBackups = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/backup.php"));
      if (!res.ok) throw new Error("Error al cargar backups");
      const data = await res.json();
      setBackups(data.backups ?? []);
    } catch (e) {
      toast.error("No se pudieron cargar las copias de seguridad");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (devMode) fetchBackups();
  }, [devMode, fetchBackups]);

  const createBackup = async () => {
    try {
      const data = { currentUserId, users, shifts, absences, departments, holidays, vacations, freeDays, absenceTypes, companyLogo, config, auditLog };
      const res = await fetch(apiUrl("/api/backup.php"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Error al crear backup");
      }
      toast.success("Copia de seguridad creada");
      fetchBackups();
    } catch {
      toast.error("Error al crear la copia de seguridad");
    }
  };

  const downloadBackup = (name: string) => {
    const url = apiUrl(`/api/backup.php?file=${encodeURIComponent(name)}`);
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.blob();
      })
      .then((blob) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = name;
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .catch(() => toast.error("Error al descargar la copia"));
  };

  const restoreBackup = async (name: string) => {
    if (!window.confirm(`¿Restaurar datos desde "${name}"?\n\nLos datos actuales se reemplazarán. Se creará una copia de seguridad previa automática.`)) return;
    setRestoring(name);
    try {
      const res = await fetch(apiUrl(`/api/backup.php?action=restore`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file: name }),
      });
      if (!res.ok) throw new Error("Error al restaurar");
      toast.success("Datos restaurados correctamente. Recarga la página.");
    } catch {
      toast.error("Error al restaurar la copia");
    } finally {
      setRestoring(null);
    }
  };

  const exportExcel = () => {
    const state = useAppStore.getState();
    if (state.shifts.length === 0) { toast.error("No hay jornadas registradas"); return; }
    exportShiftsExcelMulti(state.shifts, state.users, "jornadas-completo.xlsx");
    toast.success("Excel descargado");
  };

  const exportCsv = () => {
    const state = useAppStore.getState();
    if (state.shifts.length === 0) { toast.error("No hay jornadas registradas"); return; }
    exportShiftsCSV(state.shifts, state.users, "jornadas-completo.csv");
    toast.success("CSV descargado");
  };

  const generatePdfReport = () => {
    const state = useAppStore.getState();
    const { users, shifts } = state;
    if (shifts.length === 0) {
      toast.error("No hay jornadas registradas");
      return;
    }
    const sorted = [...shifts].sort((a, b) => a.date.localeCompare(b.date));
    const dateRange =
      sorted.length > 0
        ? `${format(parseISO(sorted[0].date), "d MMM yyyy", { locale: es })} — ${format(parseISO(sorted[sorted.length - 1].date), "d MMM yyyy", { locale: es })}`
        : "";
    const byUser = new Map<string, Shift[]>();
    for (const s of sorted) {
      if (!byUser.has(s.userId)) byUser.set(s.userId, []);
      byUser.get(s.userId)!.push(s);
    }
    const win = window.open("", "_blank");
    if (!win) { toast.error("Permite ventanas emergentes para generar el PDF"); return; }
    const fmtHM = (m: number) => `${Math.floor(m / 60)}h ${m % 60}m`;
    const rows: string[] = [];
    let grandTotal = 0;
    for (const [uid, ushifts] of byUser) {
      const u = users.find((x) => x.id === uid);
      const name = u ? `${u.name} ${u.lastName}${u.secondLastName ? " " + u.secondLastName : ""}` : uid;
      const userTotal = ushifts.reduce((a, s) => a + shiftMinutes(s), 0);
      grandTotal += userTotal;
      rows.push(`<tr><td colspan="5" class="user-name">${name}</td><td class="num">${fmtHM(userTotal)}</td></tr>`);
      for (const s of ushifts) {
        const entry = s.start ? s.start.slice(11, 16) : "—";
        const exit = s.end ? s.end.slice(11, 16) : "‖";
        const total = shiftMinutes(s);
        rows.push(`<tr>
          <td></td>
          <td>${format(parseISO(s.date), "d MMM yyyy", { locale: es })}</td>
          <td>${entry}</td>
          <td>${exit}</td>
          <td>${s.segments?.filter((g) => g.type !== "work").map((g) => `${g.start}-${g.end}`).join(", ") || "—"}</td>
          <td class="num">${fmtHM(total)}</td>
        </tr>`);
      }
    }
    win.document.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Informe de jornadas — Tempo</title>
<style>
  @page { margin: 15mm; size: A4 landscape; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; font-size: 9pt; color: #222; padding: 20px; }
  h1 { font-size: 16pt; margin-bottom: 4px; }
  .sub { color: #666; font-size: 9pt; margin-bottom: 20px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #f3f4f6; text-align: left; padding: 6px 8px; font-size: 8pt; text-transform: uppercase; color: #555; border-bottom: 2px solid #d1d5db; }
  td { padding: 4px 8px; border-bottom: 1px solid #e5e7eb; }
  .user-name { font-weight: 700; font-size: 10pt; padding-top: 10px; border-top: 2px solid #666; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .grand { font-weight: 700; border-top: 2px solid #222; font-size: 10pt; }
  .no-wrap { white-space: nowrap; }
  @media print { body { padding: 0; } }
</style></head><body>
<h1>Informe de jornadas</h1>
<div class="sub">${dateRange} · Total: ${fmtHM(grandTotal)}</div>
<table>
<thead><tr>
  <th style="width:24px"></th>
  <th>Fecha</th>
  <th class="no-wrap">Entrada</th>
  <th class="no-wrap">Salida</th>
  <th>Pausas</th>
  <th class="num" style="width:80px">Total</th>
</tr></thead>
<tbody>${rows.join("")}
<tr class="grand"><td colspan="5">Total general</td><td class="num">${fmtHM(grandTotal)}</td></tr>
</tbody></table>
<p style="margin-top:20px;font-size:8pt;color:#999;text-align:center;">Generado el ${format(new Date(), "d MMM yyyy 'a las' HH:mm", { locale: es })}</p>
</body></html>`);
    win.document.close();
    setTimeout(() => { win.focus(); win.print(); }, 500);
  };

  if (!devMode) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">
        <AlertTriangle className="mr-2 h-5 w-5" />
        <span>Solo disponible en modo administrador</span>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <AppHeader title="Copias de seguridad" />
      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <CardTitle className="text-lg">
            <HardDrive className="mr-2 inline h-5 w-5" />
            Copias de seguridad disponibles ({backups.length})
          </CardTitle>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <Button size="sm" variant="outline" onClick={fetchBackups} disabled={loading}>
              <RefreshCw className={`mr-1.5 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Recargar
            </Button>
            <Button size="sm" variant="outline" onClick={exportExcel}>
              <Table2 className="mr-1.5 h-4 w-4" />
              Excel
            </Button>
            <Button size="sm" variant="outline" onClick={exportCsv}>
              <Download className="mr-1.5 h-4 w-4" />
              CSV
            </Button>
            <Button size="sm" variant="outline" onClick={generatePdfReport}>
              <FileText className="mr-1.5 h-4 w-4" />
              Informe PDF
            </Button>
            <Button size="sm" onClick={createBackup}>
              <Upload className="mr-1.5 h-4 w-4" />
              Crear copia ahora
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Cargando copias de seguridad...</div>
          ) : backups.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No hay copias de seguridad. Crea la primera copia con el botón "Crear copia ahora".
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fichero</TableHead>
                  <TableHead className="hidden sm:table-cell">Fecha</TableHead>
                  <TableHead className="hidden sm:table-cell">Tamaño</TableHead>
                  <TableHead className="w-40">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {backups.map((b) => {
                  const date = b.modified ? format(parseISO(b.modified), "d MMM yyyy HH:mm", { locale: es }) : b.name.replace(/^tempo-(auto|backup)-/, "").replace(/.json$/, "").replace(/-/g, " ").replace(/(\d{4}) (\d{2}) (\d{2}) (\d{2})(\d{2})(\d{2})/, "$3/$2/$1 $4:$5:$6");
                  return (
                    <TableRow key={b.name}>
                      <TableCell className="font-mono text-xs truncate max-w-[150px] sm:max-w-none">{b.name}</TableCell>
                      <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">{date}</TableCell>
                      <TableCell className="hidden sm:table-cell text-xs">{formatSize(b.size)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8" title="Descargar" onClick={() => downloadBackup(b.name)}>
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" title="Restaurar" disabled={restoring === b.name} onClick={() => restoreBackup(b.name)}>
                            <RotateCcw className={`h-4 w-4 ${restoring === b.name ? "animate-spin" : ""}`} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
