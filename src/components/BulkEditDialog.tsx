import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { SegmentEditor, makeSegment } from "@/components/SegmentEditor";
import type { Shift, ShiftSegment } from "@/lib/store";
import { toast } from "sonner";

export function BulkEditDialog({
  count,
  onClose,
  onApply,
}: {
  count: number;
  onClose: () => void;
  onApply: (patch: { segments?: ShiftSegment[]; notes?: string }) => void;
}) {
  const [overrideSegments, setOverrideSegments] = useState(true);
  const [overrideNotes, setOverrideNotes] = useState(false);
  const [notes, setNotes] = useState("");
  const [segments, setSegments] = useState<ShiftSegment[]>([
    makeSegment("work", "09:00", "13:00"),
    makeSegment("break", "13:00", "14:00"),
    makeSegment("work", "14:00", "18:00"),
  ]);

  const submit = () => {
    if (!overrideSegments && !overrideNotes) {
      toast.error("Selecciona al menos un campo a modificar");
      return;
    }
    const patch: { segments?: ShiftSegment[]; notes?: string } = {};
    if (overrideSegments) {
      if (segments.length === 0) {
        toast.error("Añade al menos una franja");
        return;
      }
      patch.segments = [...segments].sort((a, b) => a.start.localeCompare(b.start));
    }
    if (overrideNotes) patch.notes = notes;
    onApply(patch);
    onClose();
  };

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>Editar {count} jornadas en lote</DialogTitle>
        <DialogDescription>
          Marca los campos que quieras sobrescribir en todas las jornadas seleccionadas.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="rounded-md border p-3 space-y-3">
          <div className="flex items-center gap-2">
            <Checkbox id="ovr-seg" checked={overrideSegments} onCheckedChange={(v) => setOverrideSegments(!!v)} />
            <Label htmlFor="ovr-seg" className="cursor-pointer">Sobrescribir franjas horarias</Label>
          </div>
          {overrideSegments && (
            <div className="pl-6">
              <SegmentEditor segments={segments} onChange={setSegments} />
            </div>
          )}
        </div>

        <div className="rounded-md border p-3 space-y-3">
          <div className="flex items-center gap-2">
            <Checkbox id="ovr-notes" checked={overrideNotes} onCheckedChange={(v) => setOverrideNotes(!!v)} />
            <Label htmlFor="ovr-notes" className="cursor-pointer">Sobrescribir observaciones</Label>
          </div>
          {overrideNotes && (
            <input
              className="w-full rounded-md border px-3 py-2 text-sm"
              placeholder="Observaciones..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          )}
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={submit}>Aplicar a {count} jornadas</Button>
      </DialogFooter>
    </DialogContent>
  );
}
