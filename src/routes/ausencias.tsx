import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useAppStore, type Absence } from "@/lib/store";
import { Plus, Trash2, Check, X } from "lucide-react";
import { format, parseISO, differenceInCalendarDays } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/ausencias")({
  head: () => ({
    meta: [
      { title: "Ausencias — Tempo" },
      { name: "description", content: "Solicita y gestiona ausencias y vacaciones del equipo." },
    ],
  }),
  component: AusenciasPage,
});

function AusenciasPage() {
  const { absences, users, addAbsence, updateAbsence, deleteAbsence } = useAppStore();
  const [open, setOpen] = useState(false);

  return (
    <>
      <AppHeader title="Ausencias" />
      <main className="flex-1 space-y-4 p-6">
        <div className="flex justify-between">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Nueva ausencia</Button>
            </DialogTrigger>
            <AbsenceForm onClose={() => setOpen(false)} onSave={(a) => { addAbsence(a); toast.success("Ausencia solicitada"); }} />
          </Dialog>
        </div>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Inicio</TableHead>
                <TableHead>Fin</TableHead>
                <TableHead>Días</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Vacaciones</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {absences.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-sm text-muted-foreground">
                    No hay ningún registro que mostrar.
                  </TableCell>
                </TableRow>
              )}
              {absences.map((a) => {
                const u = users.find((x) => x.id === a.userId);
                const days = differenceInCalendarDays(parseISO(a.endDate), parseISO(a.startDate)) + 1;
                return (
                  <TableRow key={a.id}>
                    <TableCell className="text-sm">{u?.name}</TableCell>
                    <TableCell className="text-sm">{a.reason}</TableCell>
                    <TableCell className="text-sm tabular-nums">{format(parseISO(a.startDate), "dd/MM/yyyy")}</TableCell>
                    <TableCell className="text-sm tabular-nums">{format(parseISO(a.endDate), "dd/MM/yyyy")}</TableCell>
                    <TableCell className="text-sm tabular-nums">{days}</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          a.status === "approved" ? "bg-success text-success-foreground" :
                          a.status === "rejected" ? "bg-destructive text-destructive-foreground" :
                          "bg-warning text-warning-foreground"
                        }
                      >
                        {a.status === "approved" ? "Aprobada" : a.status === "rejected" ? "Rechazada" : "Pendiente"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{a.consumesVacation ? "Sí" : "No"}</TableCell>
                    <TableCell className="text-right">
                      {a.status === "pending" && (
                        <>
                          <Button variant="ghost" size="icon" onClick={() => { updateAbsence(a.id, { status: "approved" }); toast.success("Aprobada"); }}>
                            <Check className="h-4 w-4 text-success" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => { updateAbsence(a.id, { status: "rejected" }); toast.success("Rechazada"); }}>
                            <X className="h-4 w-4 text-destructive" />
                          </Button>
                        </>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => { deleteAbsence(a.id); toast.success("Eliminada"); }}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      </main>
    </>
  );
}

function AbsenceForm({ onClose, onSave }: { onClose: () => void; onSave: (a: Omit<Absence, "id">) => void }) {
  const { users, currentUserId } = useAppStore();
  const [userId, setUserId] = useState(currentUserId);
  const [reason, setReason] = useState("Vacaciones");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [consumesVacation, setConsumesVacation] = useState(true);

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Solicitar ausencia</DialogTitle>
        <DialogDescription>Completa los datos para registrar una ausencia.</DialogDescription>
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
        <div className="grid gap-2">
          <Label>Motivo</Label>
          <Select value={reason} onValueChange={setReason}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Vacaciones">Vacaciones</SelectItem>
              <SelectItem value="Enfermedad">Enfermedad</SelectItem>
              <SelectItem value="Asuntos propios">Asuntos propios</SelectItem>
              <SelectItem value="Permiso">Permiso retribuido</SelectItem>
              <SelectItem value="Otro">Otro</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2"><Label>Desde</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
          <div className="grid gap-2"><Label>Hasta</Label><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={consumesVacation} onChange={(e) => setConsumesVacation(e.target.checked)} />
          Consume días de vacaciones
        </label>
        <div className="grid gap-2">
          <Label>Observaciones</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={() => { onSave({ userId, reason, startDate, endDate, notes, status: "pending", consumesVacation }); onClose(); }}>
          Solicitar
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
