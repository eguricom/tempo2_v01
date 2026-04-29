import { useState } from "react";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Trash2 } from "lucide-react";
import { useAppStore, type Shift } from "@/lib/store";

export function ShiftFormDialog({
  initial,
  defaultDate,
  defaultUserId,
  onClose,
  onSave,
  onDelete,
}: {
  initial?: Shift;
  defaultDate?: string;
  defaultUserId?: string;
  onClose: () => void;
  onSave: (s: Omit<Shift, "id">) => void;
  onDelete?: () => void;
}) {
  const { users, currentUserId } = useAppStore();
  const [userId, setUserId] = useState(initial?.userId ?? defaultUserId ?? currentUserId);
  const [date, setDate] = useState(
    initial ? initial.start.slice(0, 10) : defaultDate ?? new Date().toISOString().slice(0, 10),
  );
  const [startT, setStartT] = useState(initial ? format(parseISO(initial.start), "HH:mm") : "09:00");
  const [endT, setEndT] = useState(initial?.end ? format(parseISO(initial.end), "HH:mm") : "17:00");
  const [notes, setNotes] = useState(initial?.notes ?? "");

  const submit = () => {
    const start = new Date(`${date}T${startT}:00`).toISOString();
    const end = endT ? new Date(`${date}T${endT}:00`).toISOString() : null;
    onSave({ userId, date, start, end, notes, status: end ? "finished" : "in_progress" });
    onClose();
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{initial ? "Editar jornada" : "Nueva jornada"}</DialogTitle>
        <DialogDescription>Introduce los datos de la jornada.</DialogDescription>
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
        <div className="grid grid-cols-3 gap-3">
          <div className="grid gap-2">
            <Label>Fecha</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Inicio</Label>
            <Input type="time" value={startT} onChange={(e) => setStartT(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Fin</Label>
            <Input type="time" value={endT} onChange={(e) => setEndT(e.target.value)} />
          </div>
        </div>
        <div className="grid gap-2">
          <Label>Observaciones</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opcional" />
        </div>
      </div>
      <DialogFooter className="flex-row justify-between sm:justify-between">
        <div>
          {onDelete && (
            <Button variant="ghost" onClick={onDelete} className="text-destructive hover:text-destructive">
              <Trash2 className="mr-2 h-4 w-4" /> Eliminar
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit}>Guardar</Button>
        </div>
      </DialogFooter>
    </DialogContent>
  );
}
