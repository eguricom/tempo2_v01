import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppStore, shiftMinutes, formatDuration, type Shift } from "@/lib/store";
import { format, parseISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type Mode = "list" | "week" | "month";

export function PrintReportDialog({ onClose }: { onClose: () => void }) {
  const { users, shifts } = useAppStore();
  const [userId, setUserId] = useState(users[0]?.id ?? "");
  const [mode, setMode] = useState<Mode>("list");
  const today = new Date();
  const [from, setFrom] = useState(format(startOfMonth(today), "yyyy-MM-dd"));
  const [to, setTo] = useState(format(endOfMonth(today), "yyyy-MM-dd"));

  const user = users.find((u) => u.id === userId);

  const filtered = useMemo(
    () =>
      shifts
        .filter((s) => s.userId === userId)
        .filter((s) => s.date >= from && s.date <= to)
        .sort((a, b) => a.start.localeCompare(b.start)),
    [shifts, userId, from, to],
  );

  const summaries = useMemo(() => {
    const weeks = new Map<string, number>();
    const months = new Map<string, number>();
    let totalMin = 0;
    for (const s of filtered) {
      const m = shiftMinutes(s);
      totalMin += m;
      const d = parseISO(s.start);
      const wk = format(startOfWeek(d, { weekStartsOn: 1 }), "yyyy-MM-dd");
      const mo = format(d, "yyyy-MM");
      weeks.set(wk, (weeks.get(wk) ?? 0) + m);
      months.set(mo, (months.get(mo) ?? 0) + m);
    }
    return { weeks, months, totalMin };
  }, [filtered]);

  const generate = () => {
    if (!user) return;
    const doc = new jsPDF({ orientation: "portrait" });
    const W = doc.internal.pageSize.getWidth();

    // Header: worker info
    doc.setFontSize(14);
    doc.text("Informe de jornadas", 14, 16);
    doc.setFontSize(10);
    doc.text(`${user.name} ${user.lastName}`, 14, 24);
    doc.text(`NIF: ${user.nif}   ·   ${user.companyEmail || user.email}`, 14, 30);
    if (user.phone) doc.text(`Tel: ${user.phone}`, 14, 36);
    doc.text(
      `Departamento: ${user.department}   ·   Periodo: ${format(parseISO(from), "dd/MM/yyyy")} → ${format(parseISO(to), "dd/MM/yyyy")}`,
      14,
      user.phone ? 42 : 36,
    );
    doc.text(`Generado: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, W - 14, 16, { align: "right" });

    let y = user.phone ? 50 : 44;
    doc.setFontSize(11);
    doc.text(`Total horas: ${formatDuration(summaries.totalMin)}`, 14, y);
    y += 6;

    // Weekly summary
    doc.setFontSize(10);
    doc.text("Resumen semanal", 14, y);
    y += 2;
    autoTable(doc, {
      startY: y,
      head: [["Semana del", "Horas"]],
      body: Array.from(summaries.weeks.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([wk, m]) => [format(parseISO(wk), "dd/MM/yyyy"), formatDuration(m)]),
      styles: { fontSize: 8, cellPadding: 1.5 },
      headStyles: { fillColor: [30, 41, 59] },
      margin: { left: 14, right: W / 2 + 4 },
    });
    autoTable(doc, {
      startY: y,
      head: [["Mes", "Horas"]],
      body: Array.from(summaries.months.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([mo, m]) => [mo, formatDuration(m)]),
      styles: { fontSize: 8, cellPadding: 1.5 },
      headStyles: { fillColor: [30, 41, 59] },
      margin: { left: W / 2 + 4, right: 14 },
    });

    // Detail table depending on mode
    let detailY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
    let body: string[][];
    let head: string[][];
    if (mode === "list") {
      head = [["Fecha", "Inicio", "Fin", "Trabajado", "Modalidad"]];
      body = filtered.map((s) => [
        format(parseISO(s.start), "dd/MM/yyyy (EEE)"),
        format(parseISO(s.start), "HH:mm"),
        s.end ? format(parseISO(s.end), "HH:mm") : "—",
        formatDuration(shiftMinutes(s)),
        s.workMode ?? "presencial",
      ]);
    } else if (mode === "week") {
      const grouped = new Map<string, Shift[]>();
      filtered.forEach((s) => {
        const wk = format(startOfWeek(parseISO(s.start), { weekStartsOn: 1 }), "yyyy-MM-dd");
        if (!grouped.has(wk)) grouped.set(wk, []);
        grouped.get(wk)!.push(s);
      });
      head = [["Semana", "Días", "Total"]];
      body = Array.from(grouped.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([wk, items]) => {
          const end = endOfWeek(parseISO(wk), { weekStartsOn: 1 });
          return [
            `${format(parseISO(wk), "dd/MM")} → ${format(end, "dd/MM/yyyy")}`,
            String(items.length),
            formatDuration(items.reduce((a, s) => a + shiftMinutes(s), 0)),
          ];
        });
    } else {
      const grouped = new Map<string, Shift[]>();
      filtered.forEach((s) => {
        const mo = format(parseISO(s.start), "yyyy-MM");
        if (!grouped.has(mo)) grouped.set(mo, []);
        grouped.get(mo)!.push(s);
      });
      head = [["Mes", "Jornadas", "Total"]];
      body = Array.from(grouped.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([mo, items]) => [
          mo,
          String(items.length),
          formatDuration(items.reduce((a, s) => a + shiftMinutes(s), 0)),
        ]);
    }

    autoTable(doc, {
      startY: detailY,
      head,
      body,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [30, 41, 59] },
    });

    doc.save(`informe_${user.lastName}_${user.name}_${from}_${to}.pdf`);
    onClose();
  };

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>Imprimir informe de jornadas</DialogTitle>
        <DialogDescription>
          Genera un PDF con datos del trabajador y resumen semanal/mensual de horas.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-3">
        <div className="grid gap-2">
          <Label>Trabajador</Label>
          <Select value={userId} onValueChange={setUserId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>{u.name} {u.lastName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label>Vista</Label>
          <Select value={mode} onValueChange={(v) => setMode(v as Mode)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="list">Diario (detallado)</SelectItem>
              <SelectItem value="week">Semanal (resumen)</SelectItem>
              <SelectItem value="month">Mensual (resumen)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="grid gap-2"><Label>Desde</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div className="grid gap-2"><Label>Hasta</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        </div>
        <p className="text-xs text-muted-foreground">{filtered.length} jornadas en el periodo</p>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={generate} disabled={!user || filtered.length === 0}>Generar PDF</Button>
      </DialogFooter>
    </DialogContent>
  );
}
