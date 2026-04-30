import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from "lucide-react";
import { toast } from "sonner";

export function LoginOverlay() {
  const sessionUserId = useAppStore((s) => s.sessionUserId);
  const login = useAppStore((s) => s.login);
  const users = useAppStore((s) => s.users);

  const [name, setName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nif, setNif] = useState("");

  if (sessionUserId) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !lastName.trim() || !nif.trim()) {
      toast.error("Rellena todos los campos");
      return;
    }
    const user = login(name, lastName, nif);
    if (!user) {
      toast.error("Credenciales incorrectas");
      return;
    }
    toast.success(`Bienvenido/a, ${user.name}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/40 backdrop-blur-xl">
      <Card className="w-full max-w-sm shadow-2xl">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Clock className="h-6 w-6" />
          </div>
          <CardTitle>Iniciar sesión</CardTitle>
          <p className="text-xs text-muted-foreground">Accede a Tempo con tus datos</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-3">
            <div className="grid gap-2">
              <Label>Nombre</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            </div>
            <div className="grid gap-2">
              <Label>Primer apellido</Label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>NIF</Label>
              <Input value={nif} onChange={(e) => setNif(e.target.value.toUpperCase())} placeholder="00000000A" />
            </div>
            <Button type="submit" className="w-full">Entrar</Button>
            <details className="text-[11px] text-muted-foreground">
              <summary className="cursor-pointer">Usuarios de prueba</summary>
              <ul className="mt-2 space-y-1">
                {users.map((u) => (
                  <li key={u.id} className="tabular-nums">
                    {u.name} {u.lastName} · {u.nif}
                  </li>
                ))}
              </ul>
            </details>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
