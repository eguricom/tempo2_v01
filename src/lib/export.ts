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
      Estado: s.status === "finished" ? "Finalizada" : "En curso",
      Observaciones: s.notes ?? "",
    };
  });
}

export function exportShiftsExcel(shifts: Shift[], users: User[], filename = "jornadas.xlsx") {
  const data = rows(shifts, users);
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Jornadas");
  XLSX.writeFile(wb, filename);
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
