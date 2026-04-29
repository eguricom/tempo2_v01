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
import { useAppStore, type Shift, type ShiftSegment } from "@/lib/store";
import { SegmentEditor, makeSegment } from "@/components/SegmentEditor";
import { toast } from "sonner";

function defaultSegments(initial?: Shift): ShiftSegment[] {
  if (initial?.segments && initial.segments.length) return initial.segments;
  if (initial) {
    return [
      makeSegment(
        "work",
        format(parseISO(initial.start), "HH:mm"),
        initial.end ? format(parseISO(initial.end), "HH:mm") : "17:00",
      ),
    ];
  }
  return [makeSegment("work", "09:00", "13:00"), makeSegment("break", "13:00", "14:00"), makeSegment("work", "14:00", "18:00")];
}

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
  const [segments, setSegments] = useState<ShiftSegment[]>(defaultSegments(initial));
  const [notes, setNotes] = useState(initial?.notes ?? "");

  const submit = () => {
    if (segments.length === 0) {
      toast.error("Añade al menos una franja");
      return;
    }
    const ordered = [...segments].sort((a, b) => a.start.localeCompare(b.start));
    const start = new Date(`${date}T${ordered[0].start}:00`).toISOString();
    const end = new Date(`${date}T${ordered[ordered.length - 1].end}:00`).toISOString();
    onSave({ userId, date, start, end, notes, status: "finished", segments: ordered });
    onClose();
  };

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>{initial ? "Editar jornada" : "Nueva jornada"}</DialogTitle>
        <DialogDescription>Define las franjas de trabajo y descanso de la jornada.</DialogDescription>
      </DialogHeader>
      <div className="grid gap-4">
        <div className="grid grid-cols-2 gap-3">
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
            <Label>Fecha</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>

        <SegmentEditor segments={segments} onChange={setSegments} />

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
