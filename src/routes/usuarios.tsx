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
import { Plus, Trash2, Pencil, Upload } from "lucide-react";
import { toast } from "sonner";

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
  const { users, departments, addUser, updateUser, deleteUser, devMode } = useAppStore();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);

  return (
    <>
      <AppHeader title="Usuarios" />
      <main className="flex-1 space-y-4 p-6">
        <div className="flex justify-between">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button disabled={!devMode} title={!devMode ? "Activa el modo desarrollador" : undefined}>
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
                <TableHead>NIF</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Departamento</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Horas semana</TableHead>
                <TableHead>Vacaciones</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        {u.avatar && <AvatarImage src={u.avatar} alt={u.name} />}
                        <AvatarFallback className="bg-primary text-xs text-primary-foreground">{u.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{u.name} {u.lastName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm tabular-nums">{u.nif || "—"}</TableCell>
                  <TableCell className="text-sm">{u.email}</TableCell>
                  <TableCell className="text-sm">{u.department}</TableCell>
                  <TableCell>
                    <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                      {u.role === "admin" ? "Administrador" : "Empleado"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm tabular-nums">{u.weeklyHours}h</TableCell>
                  <TableCell className="text-sm tabular-nums">{u.vacationDaysTotal} días</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => setEditing(u)} disabled={!devMode}>
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
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2"><Label>Nombre</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="grid gap-2"><Label>Primer apellido</Label><Input value={lastName} onChange={(e) => setLastName(e.target.value)} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2"><Label>NIF</Label><Input value={nif} onChange={(e) => setNif(e.target.value.toUpperCase())} placeholder="00000000A" /></div>
          <div className="grid gap-2"><Label>Teléfono</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+34 600 000 000" /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2"><Label>Email personal</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div className="grid gap-2"><Label>Email empresa</Label><Input type="email" value={companyEmail} onChange={(e) => setCompanyEmail(e.target.value)} /></div>
        </div>
        <div className="rounded-md border p-3">
          <Label className="mb-2 block text-sm">Dirección</Label>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2 col-span-2"><Label className="text-xs">Calle</Label><Input value={address.street} onChange={(e) => setAddr("street", e.target.value)} /></div>
            <div className="grid gap-2"><Label className="text-xs">Piso / Puerta</Label><Input value={address.floor} onChange={(e) => setAddr("floor", e.target.value)} /></div>
            <div className="grid gap-2"><Label className="text-xs">Código postal</Label><Input value={address.postalCode} onChange={(e) => setAddr("postalCode", e.target.value)} /></div>
            <div className="grid gap-2 col-span-2"><Label className="text-xs">Ciudad</Label><Input value={address.city} onChange={(e) => setAddr("city", e.target.value)} /></div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
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
        <div className="grid grid-cols-2 gap-3">
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
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={() => { onSave({ name, lastName, nif, email, companyEmail, phone, address, role, department, weeklyHours, vacationDaysTotal, schedule }); onClose(); }}>
          Guardar
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
