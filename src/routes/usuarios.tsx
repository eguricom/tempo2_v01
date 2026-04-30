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
import { useAppStore, type User, type WeeklySchedule } from "@/lib/store";
import { WeeklyScheduleEditor } from "@/components/WeeklyScheduleEditor";
import { Plus, Trash2, Pencil } from "lucide-react";
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
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                        {u.name.charAt(0)}
                      </div>
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
  const [weeklyHours, setWeeklyHours] = useState(initial?.weeklyHours ?? 40);
  const [vacationDaysTotal, setVacationDaysTotal] = useState(initial?.vacationDaysTotal ?? 22);
  const [schedule, setSchedule] = useState<WeeklySchedule>(
    initial?.schedule ?? { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] },
  );

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
          <div className="grid gap-2"><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
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
        <Button onClick={() => { onSave({ name, lastName, nif, email, role, department, weeklyHours, vacationDaysTotal, schedule }); onClose(); }}>
          Guardar
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
