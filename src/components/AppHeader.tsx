import { useNavigate } from "@tanstack/react-router";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAppStore } from "@/lib/store";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LogOut, Timer, Clock } from "lucide-react";
import { toast } from "sonner";

export function AppHeader({ title }: { title: string }) {
  const navigate = useNavigate();
  const { users, currentUserId, setCurrentUser, shifts, devMode, endShift, logout, companyLogo } = useAppStore();
  const active = shifts.some((s) => s.userId === currentUserId && s.status === "in_progress");
  const currentUser = users.find((u) => u.id === currentUserId) ?? null;

  return (
    <header className="sticky top-0 z-10 flex h-[77px] items-center justify-between border-b bg-background/80 px-4 backdrop-blur">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="mr-[15px]" />
        <div className="relative flex h-9 w-9 items-center justify-center shrink-0">
          <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border-2 border-blue-500 bg-primary text-primary-foreground">
            {companyLogo ? (
              <img src={companyLogo} alt="Logo" className="h-full w-full object-cover" />
            ) : (
              <Clock className="h-4 w-4" />
            )}
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border border-blue-500 bg-primary text-primary-foreground shadow-xs">
            <Timer className="h-2.5 w-2.5" />
          </div>
        </div>
        <h1 className="text-base font-semibold tracking-tight">{title}</h1>
      </div>
      <div className="flex items-center gap-3 flex-wrap justify-end">
        {!active ? (
          <span className="hidden sm:inline text-sm text-muted-foreground">Bienvenido</span>
        ) : (
          <>
            <Badge className="bg-success text-success-foreground whitespace-nowrap">
              Trabajando
            </Badge>
            <Button size="sm" variant="outline" onClick={() => { endShift(currentUserId); toast.success("Jornada finalizada"); }}>
              Parar
            </Button>
          </>
        )}
        {devMode ? (
          <Select value={currentUserId} onValueChange={setCurrentUser}>
            <SelectTrigger className="w-full max-w-[220px] sm:w-[220px]">
              <SelectValue placeholder="Seleccionar usuario" />
            </SelectTrigger>
            <SelectContent>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6 shrink-0" style={u.avatarColor ? { backgroundColor: u.avatarColor } : undefined}>
                      {u.avatar && <AvatarImage src={u.avatar} alt={u.name} />}
                      <AvatarFallback className="text-[10px] text-white" style={{ backgroundColor: u.avatarColor ?? "hsl(var(--primary))" }}>{u.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span>{u.name} {u.lastName}</span>
                    {u.role === "admin" && (
                      <Badge variant="outline" className="ml-1 text-[10px]">admin</Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
        {!devMode && currentUser && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-md border px-3 py-1.5 hover:bg-accent transition-colors">
                <Avatar className="h-6 w-6 shrink-0" style={currentUser.avatarColor ? { backgroundColor: currentUser.avatarColor } : undefined}>
                  {currentUser.avatar && <AvatarImage src={currentUser.avatar} alt={currentUser.name} />}
                  <AvatarFallback className="text-[10px] text-white" style={{ backgroundColor: currentUser.avatarColor ?? "hsl(var(--primary))" }}>{currentUser.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <span className="text-sm truncate max-w-[120px] sm:max-w-[180px]">{currentUser.name} {currentUser.lastName}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[180px]">
              <DropdownMenuItem onClick={() => navigate({ to: "/jornadas" })}>
                <Clock className="mr-2 h-4 w-4" /> Ir a jornadas
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { logout(); toast.success("Sesión cerrada"); }}>
                <LogOut className="mr-2 h-4 w-4" /> Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
