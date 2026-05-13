import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { useAppStore, type User, type WeeklySchedule, type Address } from "@/lib/store";
import { WeeklyScheduleEditor } from "@/components/WeeklyScheduleEditor";
import { Plus, Trash2, Pencil, Upload, CalendarDays } from "lucide-react";
import { toast } from "sonner";

function maskNif(nif: string | undefined): string {
  if (!nif || nif.length < 6) return nif || "—";
  return nif.slice(0, 4) + "****" + nif.slice(-1);
}

export const Route = createFileRoute("/usuarios")({
  head: () => ({
    meta: [
      { title: "Usuarios — Tempo" },
      { name: "description", content: "Gestiona empleados, departamentos y roles." },
    ],
  }),
  component: UsuariosPage,
});

function UsuariosPage() {
  const { users, departments, currentUserId, addUser, updateUser, deleteUser, addVacation, devMode } = useAppStore();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [vacationUser, setVacationUser] = useState<User | null>(null);
  const [vFrom, setVFrom] = useState("");
  const [vTo, setVTo] = useState("");
  const me = users.find((u) => u.id === currentUserId);
  const isAdmin = me?.role === "admin";
  const visibleUsers = devMode || isAdmin ? users : users.filter((u) => u.id === currentUserId);

  return (
    <>
      <AppHeader title="Usuarios" />
      <main className="flex-1 space-y-4 p-4 sm:p-6">
        <div className="flex justify-between">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button disabled={!devMode} title={!devMode ? "Solo el administrador" : undefined}>
                <Plus className="mr-2 h-4 w-4" /> Nuevo usuario
              </Button>
            </DialogTrigger>
            <UserForm
              departments={departments}
              onClose={() => setOpen(false)}
              onSave={(u) => { addUser(u); toast.success("Usuario creado"); }}
            />
          </Dialog>
        </div>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead className="hidden sm:table-cell">NIF</TableHead>
                <TableHead className="hidden sm:table-cell">Email</TableHead>
                <TableHead className="hidden sm:table-cell">Departamento</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead className="hidden sm:table-cell">Horas semana</TableHead>
                <TableHead className="hidden sm:table-cell">Vacaciones</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleUsers.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        {u.avatar && <AvatarImage src={u.avatar} alt={u.name} />}
                        <AvatarFallback className="bg-primary text-xs text-primary-foreground">{u.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{u.name} {u.lastName} {u.secondLastName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm tabular-nums">{isAdmin || u.id === currentUserId ? (u.nif || "—") : maskNif(u.nif)}</TableCell>
                  <TableCell className="hidden sm:table-cell text-sm">{u.email}</TableCell>
                  <TableCell className="hidden sm:table-cell text-sm">{u.department}</TableCell>
                  <TableCell>
                    <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                      {u.role === "admin" ? "Administrador" : "Empleado"}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm tabular-nums">{isAdmin || u.id === currentUserId ? `${u.weeklyHours}h` : "—"}</TableCell>
                  <TableCell className="hidden sm:table-cell text-sm tabular-nums">{u.vacationDaysTotal} días</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => { setVacationUser(u); setVFrom(""); setVTo(""); }}>
                      <CalendarDays className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setEditing(u)} disabled={!devMode && u.id !== currentUserId}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={!devMode}
                      onClick={() => { deleteUser(u.id); toast.success("Eliminado"); }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </main>

      <Dialog open={!!vacationUser} onOpenChange={(o) => !o && setVacationUser(null)}>
        {vacationUser && (
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Añadir vacaciones — {vacationUser.name} {vacationUser.lastName}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="grid gap-2"><Label>Desde</Label><Input type="date" value={vFrom} onChange={(e) => setVFrom(e.target.value)} /></div>
                <div className="grid gap-2"><Label>Hasta</Label><Input type="date" value={vTo} onChange={(e) => setVTo(e.target.value)} /></div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setVacationUser(null)}>Cancelar</Button>
              <Button onClick={() => {
                if (!vFrom || !vTo) { toast.error("Selecciona el rango"); return; }
                if (vFrom > vTo) { toast.error("Rango inválido"); return; }
                addVacation({ userId: vacationUser.id, startDate: vFrom, endDate: vTo, kind: "vacation" });
                setVacationUser(null);
                toast.success("Vacaciones añadidas");
              }}>
                Guardar
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        {editing && (
          <UserForm
            initial={editing}
            departments={departments}
            onClose={() => setEditing(null)}
            onSave={(u) => { updateUser(editing.id, u); toast.success("Actualizado"); }}
          />
        )}
      </Dialog>
    </>
  );
}

function UserForm({
  initial,
  departments,
  onClose,
  onSave,
}: {
  initial?: User;
  departments: { id: string; name: string }[];
  onClose: () => void;
  onSave: (u: Omit<User, "id">) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [lastName, setLastName] = useState(initial?.lastName ?? "");
  const [secondLastName, setSecondLastName] = useState(initial?.secondLastName ?? "");
  const [nif, setNif] = useState(initial?.nif ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [role, setRole] = useState<User["role"]>(initial?.role ?? "employee");
  const [department, setDepartment] = useState(initial?.department ?? departments[0]?.name ?? "Otro");
  const [weeklyHours, setWeeklyHours] = useState(initial?.weeklyHours ?? 37.5);
  const [vacationDaysTotal, setVacationDaysTotal] = useState(initial?.vacationDaysTotal ?? 22);
  const [companyEmail, setCompanyEmail] = useState(initial?.companyEmail ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [address, setAddress] = useState<Address>(initial?.address ?? { street: "", floor: "", postalCode: "", city: "" });
  const [schedule, setSchedule] = useState<WeeklySchedule>(
    initial?.schedule ?? { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] },
  );
  const [avatar, setAvatar] = useState<string | undefined>(initial?.avatar);
  const [avatarColor, setAvatarColor] = useState(initial?.avatarColor ?? "#6366f1");
  const [consent, setConsent] = useState<boolean>(initial?.consent ?? false);
  const setAddr = (k: keyof Address, v: string) => setAddress((a) => ({ ...a, [k]: v }));

  const handleAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) { toast.error("Máx 1MB"); return; }
    const reader = new FileReader();
    reader.onload = () => setAvatar(reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{initial ? "Editar usuario" : "Nuevo usuario"}</DialogTitle>
      </DialogHeader>
      <div className="grid gap-4">
        <div className="flex items-center gap-3 rounded-md border p-3">
          <Avatar className="h-14 w-14">
            {avatar && <AvatarImage src={avatar} alt="avatar" />}
            <AvatarFallback className="bg-primary text-primary-foreground">{(name || "?").charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <Label className="text-sm">Avatar</Label>
            <p className="text-[11px] text-muted-foreground">JPG/PNG hasta 1MB</p>
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-sm hover:bg-muted">
            <Upload className="h-4 w-4" /> Subir
            <input type="file" accept="image/jpeg,image/png" className="hidden" onChange={handleAvatar} />
          </label>
          {avatar && (
            <Button variant="ghost" size="sm" onClick={() => setAvatar(undefined)}>Quitar</Button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="grid gap-2"><Label>Nombre</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="grid gap-2"><Label>Primer apellido</Label><Input value={lastName} onChange={(e) => setLastName(e.target.value)} /></div>
          <div className="grid gap-2"><Label>Segundo apellido</Label><Input value={secondLastName} onChange={(e) => setSecondLastName(e.target.value)} /></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="grid gap-2"><Label>NIF</Label><Input value={nif} onChange={(e) => setNif(e.target.value.toUpperCase())} placeholder="00000000A" /></div>
          <div className="grid gap-2"><Label>Teléfono</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+34 600 000 000" /></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="grid gap-2"><Label>Email personal</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div className="grid gap-2"><Label>Email empresa</Label><Input type="email" value={companyEmail} onChange={(e) => setCompanyEmail(e.target.value)} /></div>
        </div>
        <div className="rounded-md border p-3">
          <Label className="mb-2 block text-sm">Dirección</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="grid gap-2 col-span-1 sm:col-span-2"><Label className="text-xs">Calle</Label><Input value={address.street} onChange={(e) => setAddr("street", e.target.value)} /></div>
            <div className="grid gap-2"><Label className="text-xs">Piso / Puerta</Label><Input value={address.floor} onChange={(e) => setAddr("floor", e.target.value)} /></div>
            <div className="grid gap-2"><Label className="text-xs">Código postal</Label><Input value={address.postalCode} onChange={(e) => setAddr("postalCode", e.target.value)} /></div>
            <div className="grid gap-2 col-span-1 sm:col-span-2"><Label className="text-xs">Ciudad</Label><Input value={address.city} onChange={(e) => setAddr("city", e.target.value)} /></div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label>Departamento</Label>
            <Select value={department} onValueChange={setDepartment}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {departments.map((d) => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Rol</Label>
            <Select value={role} onValueChange={(v) => setRole(v as User["role"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="employee">Empleado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="grid gap-2"><Label>Horas semanales</Label><Input type="number" value={weeklyHours} onChange={(e) => setWeeklyHours(+e.target.value)} /></div>
          <div className="grid gap-2"><Label>Días vacaciones</Label><Input type="number" value={vacationDaysTotal} onChange={(e) => setVacationDaysTotal(+e.target.value)} /></div>
        </div>

        <div>
          <Label className="mb-2 block">Horario laboral</Label>
          <p className="mb-3 text-xs text-muted-foreground">
            Define las franjas habituales por día. Se usarán para autocompletar los fichajes olvidados.
          </p>
          <WeeklyScheduleEditor value={schedule} onChange={setSchedule} />
        </div>
        <label className="flex items-start gap-2 rounded-md border p-3 text-xs">
          <Checkbox checked={consent} onCheckedChange={(v) => setConsent(!!v)} className="mt-0.5" />
          <span className="text-muted-foreground">
            El usuario consiente el registro horario conforme al RD-Ley 8/2019 y RGPD: se guardan inicio/fin diarios, modalidad y modificaciones (auditoría) durante 4 años, con acceso restringido y derechos ARCO.
          </span>
        </label>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={() => { onSave({ name, lastName, nif, email, companyEmail, phone, address, role, department, weeklyHours, vacationDaysTotal, schedule, avatar, consent }); onClose(); }}>
          Guardar
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
