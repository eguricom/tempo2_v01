import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format, parseISO } from "date-fns";
import { shiftMinutes, breakMinutes, formatDuration, type Shift, type User } from "@/lib/store";

function rows(shifts: Shift[], users: User[]) {
  return shifts.map((s) => {
    const u = users.find((x) => x.id === s.userId);
    return {
      Usuario: u ? `${u.name} ${u.lastName}` : "—",
      NIF: u?.nif ?? "",
      Fecha: format(parseISO(s.start), "dd/MM/yyyy"),
      Inicio: format(parseISO(s.start), "HH:mm"),
      Fin: s.end ? format(parseISO(s.end), "HH:mm") : "—",
      Trabajado: formatDuration(shiftMinutes(s)),
      Descanso: formatDuration(breakMinutes(s)),
      Modalidad: s.workMode ?? "presencial",
      Estado: s.status === "finished" ? "Finalizada" : "En curso",
    };
  });
}

export function exportShiftsExcelMulti(shifts: Shift[], users: User[], filename = "jornadas.xlsx") {
  const wb = XLSX.utils.book_new();

  const sorted = [...shifts].sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));

  const globalData = sorted.map((s) => {
    const u = users.find((x) => x.id === s.userId);
    const pauses = s.segments?.filter((g) => g.type !== "work").map((g) => `${g.start}-${g.end}`).join(", ") || "";
    return {
      Usuario: u ? `${u.name} ${u.lastName}${u.secondLastName ? " " + u.secondLastName : ""}` : "—",
      NIF: u?.nif ?? "",
      Fecha: s.date,
      Entrada: s.start ? s.start.slice(11, 16) : "—",
      Salida: s.end ? s.end.slice(11, 16) : "‖",
      Trabajado: formatDuration(shiftMinutes(s)),
      Pausas: pauses,
    };
  });
  const wsGlobal = XLSX.utils.json_to_sheet(globalData);
  XLSX.utils.book_append_sheet(wb, wsGlobal, "Global");

  const byUser = new Map<string, Shift[]>();
  for (const s of sorted) {
    if (!byUser.has(s.userId)) byUser.set(s.userId, []);
    byUser.get(s.userId)!.push(s);
  }
  for (const [uid, ushifts] of byUser) {
    const u = users.find((x) => x.id === uid);
    const sheetName = u ? `${u.name} ${u.lastName}`.slice(0, 31) : uid;
    const userData = ushifts.map((s) => {
      const pauses = s.segments?.filter((g) => g.type !== "work").map((g) => `${g.start}-${g.end}`).join(", ") || "";
      return {
        Fecha: s.date,
        Entrada: s.start ? s.start.slice(11, 16) : "—",
        Salida: s.end ? s.end.slice(11, 16) : "‖",
        Trabajado: formatDuration(shiftMinutes(s)),
        Pausas: pauses,
      };
    });
    const ws = XLSX.utils.json_to_sheet(userData);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }

  XLSX.writeFile(wb, filename);
}

export function exportShiftsExcel(shifts: Shift[], users: User[], filename = "jornadas.xlsx") {
  const data = rows(shifts, users);
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Jornadas");
  XLSX.writeFile(wb, filename);
}

export function exportShiftsCSV(shifts: Shift[], users: User[], filename = "jornadas.csv") {
  const data = rows(shifts, users);
  const head = Object.keys(data[0] ?? {});
  const lines = [head.join(",")];
  for (const r of data) {
    const vals = Object.values(r).map((v) => `"${String(v).replace(/"/g, '""')}"`);
    lines.push(vals.join(","));
  }
  const bom = "\uFEFF";
  const blob = new Blob([bom + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportShiftsPDF(shifts: Shift[], users: User[], filename = "jornadas.pdf") {
  const data = rows(shifts, users);
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(14);
  doc.text("Jornadas", 14, 14);
  doc.setFontSize(10);
  doc.text(`Generado el ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 20);
  const head = [Object.keys(data[0] ?? { Usuario: "", Fecha: "", Inicio: "", Fin: "", Trabajado: "", Descanso: "", Estado: "" })];
  const body = data.map((r) => Object.values(r) as string[]);
  autoTable(doc, {
    head,
    body,
    startY: 26,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [30, 41, 59] },
  });
  doc.save(filename);
}
