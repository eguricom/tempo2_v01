import { useState } from "react";
import { useAppStore, normalize, validatePassword } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Clock, Eye, EyeOff, HelpCircle, Timer, Upload, Lock } from "lucide-react";
import { toast } from "sonner";

export function LoginOverlay() {
  const sessionUserId = useAppStore((s) => s.sessionUserId);
  const sessionCount = useAppStore((s) => s.sessionCount);
  const forcePwChangeUserId = useAppStore((s) => s.forcePasswordChangeUserId);
  const users = useAppStore((s) => s.users);

  if (users.length === 0) {
    return <BlockedOverlay />;
  }

  if (forcePwChangeUserId) {
    const user = users.find((u) => u.id === forcePwChangeUserId);
    if (user) return <PasswordChangeOverlay user={user} />;
  }

  if (sessionUserId) return null;

  return <LoginForm key={sessionCount} />;
}

function BlockedOverlay() {
  const [code, setCode] = useState("");
  const [unlocked, setUnlocked] = useState(false);

  const handleUnlock = () => {
    const unlockCode = import.meta.env.VITE_UNLOCK_CODE || "tempo-molotov-2024";
    if (code.trim() === unlockCode) {
      setUnlocked(true);
    } else {
      toast.error("Código incorrecto");
    }
  };

  if (unlocked) {
    return <SetupForm />;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center overflow-y-auto bg-background/40 backdrop-blur-xl p-2 sm:p-4">
      <Card className="w-full max-w-xs sm:max-w-sm shadow-2xl my-auto">
        <CardHeader className="space-y-1 sm:space-y-2 text-center px-3 sm:px-6 pt-4 sm:pt-6">
          <div className="mx-auto flex h-14 w-14 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Lock className="h-6 w-6 sm:h-8 sm:w-8" />
          </div>
          <CardTitle className="text-sm sm:text-base">Tempo</CardTitle>
          <p className="text-xs text-muted-foreground">By Molotov Cóctel Creativo SLU</p>
        </CardHeader>
        <CardContent className="px-3 sm:px-6 pb-4 sm:pb-6">
          <p className="text-xs sm:text-sm text-center text-muted-foreground mb-4">
            Esta aplicación está bloqueada. Introduce el código de desbloqueo para configurar el acceso.
          </p>
          <div className="flex gap-2">
            <Input
              type="password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Código de desbloqueo"
              className="h-8 text-sm flex-1"
              onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
            />
            <Button size="sm" onClick={handleUnlock} className="h-8">
              Desbloquear
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SetupForm() {
  const addUser = useAppStore((s) => s.addUser);

  const [name, setName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [nif, setNif] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !lastName.trim() || !email.trim() || !nif.trim()) {
      toast.error("Rellena todos los campos");
      return;
    }
    addUser({
      name: name.trim(),
      lastName: lastName.trim(),
      secondLastName: "",
      nif: nif.trim(),
      email: email.trim(),
      companyEmail: email.trim(),
      phone: "",
      address: { street: "", floor: "", postalCode: "", city: "" },
      role: "admin",
      department: "",
      weeklyHours: 37.5,
      vacationDaysTotal: 22,
      schedule: { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] },
      consent: true,
      permissions: {
        bulk_add: true, edit_shifts: true, export: true,
        manage_users: true, manage_absences: true, manage_config: true, magic_balance: true,
      },
    });
    toast.success("Administrador creado. Ya puedes iniciar sesión con tu NIF.");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center overflow-y-auto bg-background/40 backdrop-blur-xl p-2 sm:p-4">
      <Card className="w-full max-w-xs sm:max-w-sm shadow-2xl my-auto">
        <CardHeader className="px-3 sm:px-6 pt-4 sm:pt-6">
          <CardTitle className="text-sm sm:text-base">Configurar administrador</CardTitle>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Crea el usuario administrador para acceder a la aplicación.
          </p>
        </CardHeader>
        <CardContent className="px-3 sm:px-6 pb-4 sm:pb-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-y-[20px]">
            <div className="grid gap-y-[5px]">
              <Label className="text-xs">Nombre</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8 text-sm" autoFocus />
            </div>
            <div className="grid gap-y-[5px]">
              <Label className="text-xs">Primer apellido</Label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} className="h-8 text-sm" />
            </div>
            <div className="grid gap-y-[5px]">
              <Label className="text-xs">Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-8 text-sm" />
            </div>
            <div className="grid gap-y-[5px]">
              <Label className="text-xs">NIF (se usa como contraseña en el primer acceso)</Label>
              <Input value={nif} onChange={(e) => setNif(e.target.value)} className="h-8 text-sm" />
            </div>
            <Button type="submit" className="w-full h-8 text-xs sm:text-sm">
              Crear administrador
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function LoginForm() {
  const login = useAppStore((s) => s.login);
  const companyLogo = useAppStore((s) => s.companyLogo);
  const users = useAppStore((s) => s.users);

  const [name, setName] = useState("");
  const [lastName, setLastName] = useState("");
  const [secondLastName, setSecondLastName] = useState("");
  const [email, setEmail] = useState("");
  const [nif, setNif] = useState("");
  const [showNif, setShowNif] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [remindOpen, setRemindOpen] = useState(false);
  const [remindEmail, setRemindEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const hasSomething = name.trim() || lastName.trim() || secondLastName.trim() || email.trim();
    if (!hasSomething || !nif.trim()) {
      toast.error("Rellena al menos un campo identificativo y la contraseña");
      return;
    }
    setLoading(true);
    const user = await login({ name: name.trim(), lastName: lastName.trim(), secondLastName: secondLastName.trim(), email: email.trim(), nif: nif.trim() });
    setLoading(false);
    if (!user) {
      toast.error("Credenciales incorrectas");
      return;
    }
    toast.success(`Bienvenido/a, ${user.name}`);
  };

  const handleRemind = () => {
    const found = users.find((u) => normalize(u.email) === normalize(remindEmail.trim()) || normalize(u.companyEmail) === normalize(remindEmail.trim()));
    if (!found) {
      toast.error("No encontramos ningún usuario con ese email");
      return;
    }
    const masked = found.nif && found.nif.length >= 6 ? found.nif.slice(0, 4) + "****" + found.nif.slice(-1) : found.nif;
    toast.success(`Tus datos: ${found.name} ${found.lastName} ${found.secondLastName}, NIF: ${masked}`);
    setRemindOpen(false);
    setRemindEmail("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center overflow-y-auto bg-background/40 backdrop-blur-xl p-2 sm:p-4">
      <Card className="w-full max-w-xs sm:max-w-sm shadow-2xl my-auto">
        <CardHeader className="space-y-1 sm:space-y-2 text-center px-3 sm:px-6 pt-4 sm:pt-6">
          <div className="relative mx-auto flex h-14 w-14 sm:h-20 sm:w-20 items-center justify-center">
            <div className="flex h-14 w-14 sm:h-20 sm:w-20 items-center justify-center overflow-hidden rounded-full border-2 border-blue-500 bg-primary text-primary-foreground">
              {companyLogo ? (
                <img src={companyLogo} alt="Logo" className="h-full w-full object-cover" />
              ) : (
                <Clock className="h-5 w-5 sm:h-8 sm:w-8" />
              )}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 sm:h-8 sm:w-8 items-center justify-center rounded-full border-2 border-blue-500 bg-primary text-primary-foreground shadow-sm">
              <Timer className="h-2.5 w-2.5 sm:h-4 sm:w-4" />
            </div>
          </div>
          <CardTitle className="text-sm sm:text-base">Tempo</CardTitle>
          <p className="text-[10px] sm:text-xs text-muted-foreground">By Molotov Cóctel Creativo SLU</p>
        </CardHeader>
        <CardContent className="px-3 sm:px-6 pb-4 sm:pb-6">
          <form onSubmit={submit} className="flex flex-col gap-y-[20px]">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" style={{ marginBottom: 5 }}>
              <div className="grid gap-y-[5px]">
                <Label className="text-xs">Nombre</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus className="h-8 text-sm" />
              </div>
              <div className="grid gap-y-[5px]">
                <Label className="text-xs">Primer apellido</Label>
                <Input value={lastName} onChange={(e) => setLastName(e.target.value)} className="h-8 text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" style={{ marginBottom: 5 }}>
              <div className="grid gap-y-[5px]">
                <Label className="text-xs">Segundo apellido</Label>
                <Input value={secondLastName} onChange={(e) => setSecondLastName(e.target.value)} className="h-8 text-sm" />
              </div>
              <div className="grid gap-y-[5px]">
                <Label className="text-xs">Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-8 text-sm" />
              </div>
            </div>
            <div className="grid gap-y-[5px]">
              <Label className="text-xs">NIF (1ª vez) / Contraseña</Label>
              <div className="relative">
                <Input type={showNif ? "text" : "password"} value={nif} onChange={(e) => setNif(e.target.value)} className="h-8 pr-8 text-sm" />
                <button type="button" onClick={() => setShowNif(!showNif)} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showNif ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full h-8 sm:h-9 text-xs sm:text-sm" disabled={loading}>{loading ? "Entrando..." : "Entrar"}</Button>
          </form>
          <div className="mt-2 sm:mt-3 flex items-center justify-center gap-3">
            <button type="button" onClick={() => setRemindOpen(true)} className="text-[10px] sm:text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
              Recordar credenciales
            </button>
            <button type="button" onClick={() => setHelpOpen(!helpOpen)} className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
              <HelpCircle className="h-2.5 w-2.5 sm:h-3 sm:h-3" /> Ayuda
            </button>
          </div>
          {helpOpen && (
            <div className="mt-2 sm:mt-3 rounded-md border bg-muted/50 p-2 sm:p-3 text-[10px] sm:text-xs text-muted-foreground">
              <p><strong>Primer acceso:</strong> introduce tu NIF en el campo de contraseña. Si el sistema te reconoce, te pedirá crear una contraseña nueva.</p>
              <p className="mt-2"><strong>Ya registrado:</strong> introduce tu contraseña.</p>
              <p className="mt-2">Puedes identificarte por nombre, apellidos o email (no es necesario rellenar todos los campos).</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={remindOpen} onOpenChange={setRemindOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Recordar credenciales</DialogTitle>
            <DialogDescription>Introduce tu email y te enviaremos tus datos de acceso.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid gap-2">
              <Label>Email</Label>
              <Input type="email" value={remindEmail} onChange={(e) => setRemindEmail(e.target.value)} autoFocus />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemindOpen(false)}>Cancelar</Button>
            <Button onClick={handleRemind}>Enviar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PasswordChangeOverlay({ user }: { user: NonNullable<ReturnType<typeof useAppStore.getState>["users"][0]> }) {
  const updatePassword = useAppStore((s) => s.updatePassword);
  const logout = useAppStore((s) => s.logout);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const requirements = [
    { label: "Mínimo 12 caracteres", check: newPassword.length >= 12 },
    { label: "Al menos una mayúscula", check: /[A-Z]/.test(newPassword) },
    { label: "Al menos una minúscula", check: /[a-z]/.test(newPassword) },
    { label: "Al menos un número", check: /[0-9]/.test(newPassword) },
    { label: "Al menos un carácter especial", check: /[^A-Za-z0-9\s]/.test(newPassword) },
    { label: "No contiene tu nombre, apellido, NIF ni email", check: validatePassword(newPassword, user) === null },
  ];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    const err = validatePassword(newPassword, user);
    if (err) {
      setError(err);
      return;
    }

    setLoading(true);
    await updatePassword(user.id, newPassword);
    toast.success("Contraseña actualizada correctamente");
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center overflow-y-auto bg-background/40 backdrop-blur-xl p-2 sm:p-4">
      <Card className="w-full max-w-xs sm:max-w-sm shadow-2xl my-auto">
        <CardHeader className="px-3 sm:px-6 pt-4 sm:pt-6">
          <CardTitle className="text-sm sm:text-base">Cambiar contraseña</CardTitle>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Es necesario cambiar tu contraseña antes de continuar. La contraseña actual es tu NIF.
          </p>
        </CardHeader>
        <CardContent className="px-3 sm:px-6 pb-4 sm:pb-6">
          <form onSubmit={submit} className="flex flex-col gap-y-[20px]">
            <div className="grid gap-y-[5px]">
              <Label>Nueva contraseña</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="h-8 pr-8 text-sm"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="grid gap-y-[5px]">
              <Label>Confirmar contraseña</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            {error && <p className="text-xs sm:text-sm text-destructive">{error}</p>}
            <ul className="text-[10px] sm:text-xs text-muted-foreground space-y-0.5">
              {requirements.map((r) => (
                <li key={r.label} className={r.check ? "text-green-600" : ""}>
                  {r.check ? "✓" : "○"} {r.label}
                </li>
              ))}
            </ul>
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" className="flex-1 h-8 sm:h-9 text-xs sm:text-sm" onClick={logout}>
                Cerrar sesión
              </Button>
              <Button type="submit" className="flex-1" disabled={loading || requirements.some((r) => !r.check)}>
                {loading ? "Guardando..." : "Cambiar contraseña"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
