import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Wrench } from "lucide-react";
import { toast } from "sonner";

export function DevModeToggle() {
  const devMode = useAppStore((s) => s.devMode);
  const toggleDevMode = useAppStore((s) => s.toggleDevMode);
  const [open, setOpen] = useState(false);
  const [pwd, setPwd] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const ok = toggleDevMode(pwd);
    if (!ok) {
      toast.error("Contraseña incorrecta");
      return;
    }
    setPwd("");
    setOpen(false);
    toast.success(devMode ? "Modo desarrollador desactivado" : "Modo desarrollador activado");
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-md border bg-background px-2.5 py-1 text-xs font-medium transition-colors hover:bg-muted"
        title="Modo desarrollador"
      >
        <Wrench className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Modo dev</span>
        <Switch checked={devMode} className="pointer-events-none scale-75" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{devMode ? "Desactivar" : "Activar"} modo desarrollador</DialogTitle>
            <DialogDescription>
              Introduce la contraseña para {devMode ? "desactivar" : "activar"} la edición manual de fichajes.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-3">
            <div className="grid gap-2">
              <Label>Contraseña</Label>
              <Input
                type="password"
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Confirmar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
