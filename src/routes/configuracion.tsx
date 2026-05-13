import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAppStore } from "@/lib/store";

import { Plus, Trash2, Wand2, Clock, Upload, Timer } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

function UnsavedChangesDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Cambios sin guardar</DialogTitle>
          <DialogDescription>
            Tienes cambios sin guardar. Si continúas, se perderán los cambios realizados.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Seguir editando</Button>
          <Button variant="destructive" onClick={() => { onOpenChange(false); }}>Descartar cambios</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export const Route = createFileRoute("/configuracion")({
  head: () => ({
    meta: [
      { title: "Configuración — Tempo" },
      { name: "description", content: "Configura horas, contrato, vacaciones y departamentos." },
    ],
  }),
  component: ConfigPage,
});

const dayNames = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];

function ConfigPage() {
  const {
    config,
    updateConfig,
    departments,
    addDepartment,
    deleteDepartment,
    users,
    currentUserId,
    updateUser,
    autoFillShifts,
    devMode,
    absenceTypes, addAbsenceType, deleteAbsenceType,
  } = useAppStore();
  const me = users.find((u) => u.id === currentUserId);
  const [dirty, setDirty] = useState(false);
  const [showUnsaved, setShowUnsaved] = useState(false);

  useEffect(() => {
    if (dirty) {
      const handler = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = "";
      };
      window.addEventListener("beforeunload", handler);
      return () => window.removeEventListener("beforeunload", handler);
    }
  }, [dirty]);

  const [newDept, setNewDept] = useState("");
  const [newColor, setNewColor] = useState("#93c5fd");

  const today = new Date().toISOString().slice(0, 10);
  const [rangeFrom, setRangeFrom] = useState("");
  const [rangeTo, setRangeTo] = useState(today);
  const [autoFrom, setAutoFrom] = useState("");

  const toggleDay = (i: number) => {
    const set = new Set(config.workDays);
    if (set.has(i)) set.delete(i);
    else set.add(i);
    updateConfig({ workDays: Array.from(set).sort() });
  };

  const runFill = (from: string, to: string) => {
    if (!me) return;
    if (!from || !to) {
      toast.error("Selecciona las fechas");
      return;
    }
    if (from > to) {
      toast.error("La fecha inicial debe ser anterior a la final");
      return;
    }
    const n = autoFillShifts(me.id, from, to);
    if (n === 0) toast.info("No había huecos que rellenar en ese rango");
    else toast.success(`${n} jornada${n === 1 ? "" : "s"} autocompletada${n === 1 ? "" : "s"}`);
  };

  return (
    <>
      <AppHeader title="Configuración" />
      <main className="flex-1 space-y-4 sm:space-y-6 p-3 sm:p-6">
        <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-4 sm:space-y-6 lg:col-span-2">

        {me && devMode && (
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                <Wand2 className="h-3 w-3 sm:h-4 sm:w-4" /> Rellenar fichajes olvidados
              </CardTitle>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Crea automáticamente las jornadas que faltan según tu horario. Solo rellena los días sin jornada existente.
              </p>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6 pb-4 sm:pb-6">
              <div className="grid grid-cols-1 gap-2 sm:gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
                <div className="grid gap-1 sm:gap-2">
                  <Label className="text-xs sm:text-sm">Desde</Label>
                  <Input type="date" value={rangeFrom} onChange={(e) => setRangeFrom(e.target.value)} className="h-8 sm:h-9 text-xs sm:text-sm" />
                </div>
                <div className="grid gap-1 sm:gap-2">
                  <Label className="text-xs sm:text-sm">Hasta</Label>
                  <Input type="date" value={rangeTo} onChange={(e) => setRangeTo(e.target.value)} className="h-8 sm:h-9 text-xs sm:text-sm" />
                </div>
                <Button onClick={() => runFill(rangeFrom, rangeTo)} className="h-8 sm:h-9 text-xs sm:text-sm">
                  Rellenar rango
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:gap-3 md:grid-cols-[1fr_auto] md:items-end">
                <div className="grid gap-1 sm:gap-2">
                  <Label className="text-xs sm:text-sm">Automático desde una fecha hasta hoy</Label>
                  <Input type="date" value={autoFrom} onChange={(e) => setAutoFrom(e.target.value)} className="h-8 sm:h-9 text-xs sm:text-sm" />
                </div>
                <Button variant="outline" onClick={() => runFill(autoFrom, today)} className="h-8 sm:h-9 text-xs sm:text-sm">
                  Rellenar hasta hoy
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-sm sm:text-base">Configuración de la empresa</CardTitle>
            <p className="text-xs sm:text-sm text-muted-foreground">Define la configuración por defecto para tus usuarios.</p>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
            <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
              <div className="grid gap-1 sm:gap-2">
                <Label className="text-xs sm:text-sm">Horas semanales</Label>
                <Input type="number" value={config.weeklyHours} onChange={(e) => { updateConfig({ weeklyHours: +e.target.value }); setDirty(true); }} className="h-8 sm:h-9 text-xs sm:text-sm" />
              </div>
              <div className="grid gap-1 sm:gap-2">
                <Label className="text-xs sm:text-sm">Horas anuales</Label>
                <Input type="number" value={config.annualHours} onChange={(e) => { updateConfig({ annualHours: +e.target.value }); setDirty(true); }} className="h-8 sm:h-9 text-xs sm:text-sm" />
              </div>
              <div className="grid gap-1 sm:gap-2">
                <Label className="text-xs sm:text-sm">Tipo de contrato</Label>
                <Select value={config.contractType} onValueChange={(v) => { updateConfig({ contractType: v }); setDirty(true); }}>
                  <SelectTrigger className="h-8 sm:h-9 text-xs sm:text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Jornada completa">Jornada completa</SelectItem>
                    <SelectItem value="Media jornada">Media jornada</SelectItem>
                    <SelectItem value="Por horas">Por horas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1 sm:gap-2">
                <Label className="text-xs sm:text-sm">Días de vacaciones anuales</Label>
                <Input type="number" value={config.vacationDays} onChange={(e) => { updateConfig({ vacationDays: +e.target.value }); setDirty(true); }} className="h-8 sm:h-9 text-xs sm:text-sm" />
              </div>
              <div className="grid gap-2 md:col-span-2">
                <Label>Días que trabaja</Label>
                <div className="flex flex-wrap gap-1">
                  {dayNames.map((d, i) => {
                    const active = config.workDays.includes(i);
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => { toggleDay(i); setDirty(true); }}
                        className={`min-h-[32px] min-w-0 h-7 sm:h-8 sm:w-8 flex-1 sm:flex-none rounded-md border text-xs sm:text-sm font-medium transition-colors ${
                          active ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted"
                        }`}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="mt-4 sm:mt-6 flex justify-end">
              <Button onClick={() => { setDirty(false); toast.success("Cambios guardados"); }} className="h-8 sm:h-9 text-xs sm:text-sm">Guardar cambios</Button>
            </div>
          </CardContent>
        </Card>
          </div>
        </div>

        <Tabs defaultValue="departments">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="departments" className="text-xs sm:text-sm px-2 sm:px-3">Departamentos</TabsTrigger>
            <TabsTrigger value="absence-types" className="text-xs sm:text-sm px-2 sm:px-3">Tipos de ausencia</TabsTrigger>
            {devMode && <TabsTrigger value="permissions" className="text-xs sm:text-sm px-2 sm:px-3">Permisos</TabsTrigger>}
            <TabsTrigger value="other" className="text-xs sm:text-sm px-2 sm:px-3">Otras configuraciones</TabsTrigger>
          </TabsList>
          <TabsContent value="departments">
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-sm sm:text-base">Departamentos</CardTitle>
              </CardHeader>
              <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
                <div className="mb-4 flex flex-wrap items-end gap-2 sm:gap-3">
                  <div className="grid gap-1 sm:gap-2 flex-1 min-w-[120px]">
                    <Label className="text-xs sm:text-sm">Nombre</Label>
                    <Input value={newDept} onChange={(e) => setNewDept(e.target.value)} placeholder="p. ej. Marketing" className="h-8 sm:h-9 text-xs sm:text-sm" />
                  </div>
                  <div className="grid gap-1 sm:gap-2">
                    <Label className="text-xs sm:text-sm">Color</Label>
                    <Input type="color" value={newColor} onChange={(e) => setNewColor(e.target.value)} className="w-14 sm:w-20 p-1 h-8 sm:h-9" />
                  </div>
                  <Button
                    onClick={() => {
                      if (!newDept.trim()) return;
                      addDepartment({ name: newDept.trim(), color: newColor });
                      setNewDept("");
                      toast.success("Departamento añadido");
                    }}
                    className="h-8 sm:h-9 text-xs sm:text-sm"
                  >
                    <Plus className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" /> Añadir
                  </Button>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Color</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {departments.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell><div className="h-5 w-5 rounded-full" style={{ background: d.color }} /></TableCell>
                        <TableCell className="text-sm">{d.name}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => { deleteDepartment(d.id); toast.success("Eliminado"); }}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="absence-types">
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-sm sm:text-base">Tipos de ausencia</CardTitle>
                <p className="text-xs sm:text-sm text-muted-foreground">Gestiona los tipos de ausencia disponibles al solicitarlas.</p>
              </CardHeader>
              <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
                <AbsenceTypesManager />
              </CardContent>
            </Card>
          </TabsContent>
          {devMode && (
            <TabsContent value="permissions">
              <PermissionsManager />
            </TabsContent>
          )}
          <TabsContent value="other">
            <div className="space-y-4">
              <Card>
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="text-sm sm:text-base">Logotipo de empresa</CardTitle>
                  <p className="text-xs sm:text-sm text-muted-foreground">Este logo sustituye al icono de la pantalla de inicio de sesión.</p>
                </CardHeader>
                <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
                  <CompanyLogoUploader />
                </CardContent>
              </Card>
              {devMode && (
                <Card>
                  <CardHeader className="p-4 sm:p-6">
                    <CardTitle className="text-sm sm:text-base">Registro de auditoría</CardTitle>
                    <p className="text-xs sm:text-sm text-muted-foreground">Historial de acciones realizadas en la aplicación.</p>
                  </CardHeader>
                  <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
                    <AuditLogViewer />
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <UnsavedChangesDialog open={showUnsaved} onOpenChange={setShowUnsaved} />
        <DevModeFooter />
      </main>
    </>
  );
}

function AbsenceTypesManager() {
  const { absenceTypes, addAbsenceType, deleteAbsenceType, devMode } = useAppStore();
  const [newType, setNewType] = useState("");

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-2 sm:gap-3">
        <div className="grid gap-1 sm:gap-2 flex-1">
          <Label className="text-xs sm:text-sm">Nuevo tipo</Label>
          <Input value={newType} onChange={(e) => setNewType(e.target.value)} placeholder="p. ej. Maternidad" className="h-8 sm:h-9 text-xs sm:text-sm" />
        </div>
        <Button
          disabled={!devMode}
          onClick={() => {
            if (!newType.trim()) return;
            addAbsenceType(newType.trim());
            setNewType("");
            toast.success("Tipo añadido");
          }}
          className="h-8 sm:h-9 text-xs sm:text-sm"
        >
          <Plus className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" /> Añadir
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {absenceTypes.map((t) => (
            <TableRow key={t}>
              <TableCell className="text-sm">{t}</TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="icon" disabled={!devMode} onClick={() => { deleteAbsenceType(t); toast.success("Eliminado"); }}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {absenceTypes.length === 0 && (
            <TableRow><TableCell colSpan={2} className="py-8 text-center text-sm text-muted-foreground">Sin tipos de ausencia</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function AuditLogViewer() {
  const { auditLog, users, devMode } = useAppStore();

  if (!devMode) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Solo el administrador puede ver el registro.</p>;
  }

  return (
    <ScrollArea className="max-h-[400px]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="hidden sm:table-cell">Fecha</TableHead>
            <TableHead>Usuario</TableHead>
            <TableHead>Acción</TableHead>
            <TableHead className="hidden sm:table-cell">Detalles</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {auditLog.length === 0 && (
            <TableRow><TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">Sin registros</TableCell></TableRow>
          )}
          {auditLog.map((e) => {
            const actor = users.find((u) => u.id === e.actorId);
            const target = users.find((u) => u.id === e.userId);
            return (
              <TableRow key={e.id}>
                <TableCell className="hidden sm:table-cell whitespace-nowrap text-xs tabular-nums text-muted-foreground">{new Date(e.ts).toLocaleString()}</TableCell>
                <TableCell className="text-xs">{actor ? `${actor.name}` : e.actorId ?? "—"}{target && target.id !== e.actorId ? ` → ${target.name}` : ""}</TableCell>
                <TableCell className="text-xs">{e.action}</TableCell>
                <TableCell className="hidden sm:table-cell max-w-[200px] truncate text-xs text-muted-foreground">{e.details ?? "—"}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}

function CompanyLogoUploader() {
  const { companyLogo, updateCompanyLogo } = useAppStore();

  const handleLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) { toast.error("Máx 1MB"); return; }
    const reader = new FileReader();
    reader.onload = () => updateCompanyLogo(reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-4">
      <div className="relative flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center shrink-0">
        <div className="flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center overflow-hidden rounded-full border-2 border-blue-500 bg-primary text-primary-foreground">
          {companyLogo ? (
            <img src={companyLogo} alt="Logo empresa" className="h-full w-full object-cover" />
          ) : (
            <Clock className="h-6 w-6 sm:h-8 sm:w-8" />
          )}
        </div>
        <div className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full border-2 border-blue-500 bg-primary text-primary-foreground shadow-sm">
          <Timer className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
        </div>
      </div>
      <div className="flex-1 min-w-[120px]">
        <p className="text-xs sm:text-sm font-medium">Logo actual</p>
        <p className="text-xs text-muted-foreground">JPG/PNG hasta 1MB. Se mostrará en la pantalla de inicio de sesión.</p>
      </div>
      <label className="inline-flex cursor-pointer items-center gap-1 sm:gap-2 rounded-md border bg-background px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm hover:bg-muted">
        <Upload className="h-3 w-3 sm:h-4 sm:w-4" /> Subir
        <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleLogo} />
      </label>
      {companyLogo && (
        <Button variant="ghost" size="sm" onClick={() => updateCompanyLogo("")} className="h-7 sm:h-8 text-xs sm:text-sm">Quitar</Button>
      )}
    </div>
  );
}

const PERMISSION_LABELS: Record<string, string> = {
  bulk_add: "Carga en lote",
  edit_shifts: "Editar jornadas",
  export: "Exportar datos",
  manage_users: "Gestionar usuarios",
  manage_absences: "Gestionar ausencias",
  manage_config: "Gestionar configuración",
  magic_balance: "Cuadre mágico",
};

function PermissionsManager() {
  const { users, updateUser } = useAppStore();

  const toggle = (userId: string, perm: string) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;
    const current = user.permissions?.[perm] ?? true;
    updateUser(userId, {
      permissions: { ...user.permissions, [perm]: !current },
    });
  };

  return (
    <Card>
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="text-sm sm:text-base">Permisos por usuario</CardTitle>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Activa o desactiva herramientas para cada usuario.
        </p>
      </CardHeader>
      <CardContent className="overflow-x-auto px-4 sm:px-6 pb-4 sm:pb-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="whitespace-nowrap">Usuario</TableHead>
              {Object.entries(PERMISSION_LABELS).map(([key, label]) => (
                <TableHead key={key} className="text-center whitespace-nowrap text-xs">
                  {label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="text-sm font-medium whitespace-nowrap">
                  {u.name} {u.lastName}
                </TableCell>
                {Object.keys(PERMISSION_LABELS).map((perm) => {
                  const enabled = u.permissions?.[perm] ?? true;
                  return (
                    <TableCell key={perm} className="text-center">
                      <Switch
                        checked={enabled}
                        onCheckedChange={() => toggle(u.id, perm)}
                      />
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function DevModeFooter() {
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
    toast.success(devMode ? "Modo administrador desactivado" : "Modo administrador activado");
  };

  return (
    <div className="pt-12 pb-[50px] text-center">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-[11px] text-muted-foreground/60 underline-offset-4 hover:text-muted-foreground hover:underline"
      >
        By Molotov Cóctel Creativo
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{devMode ? "Desactivar" : "Activar"} modo administrador</DialogTitle>
            <DialogDescription>
              Introduce la contraseña para {devMode ? "desactivar" : "activar"} la edición manual de fichajes.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-3">
            <div className="grid gap-2">
              <Label>Contraseña</Label>
              <Input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} autoFocus />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit">Confirmar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
