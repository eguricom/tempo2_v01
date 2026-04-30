import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAppStore } from "@/lib/store";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { toast } from "sonner";

export function AppHeader({ title }: { title: string }) {
  const { users, currentUserId, setCurrentUser, shifts, devMode, logout, sessionUserId } = useAppStore();
  const active = shifts.some((s) => s.userId === currentUserId && s.status === "in_progress");

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b bg-background/80 px-4 backdrop-blur">
      <div className="flex items-center gap-3">
        <SidebarTrigger />
        <h1 className="text-base font-semibold tracking-tight">{title}</h1>
      </div>
      <div className="flex items-center gap-3">
        <Badge variant={active ? "default" : "secondary"} className={active ? "bg-success text-success-foreground" : ""}>
          {active ? "Trabajando" : "Descansando"}
        </Badge>
        <Select value={currentUserId} onValueChange={setCurrentUser} disabled={!devMode}>
          <SelectTrigger className="w-[220px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {users.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                    {u.name.charAt(0)}
                  </div>
                  <span>{u.name} {u.lastName}</span>
                  {u.role === "admin" && (
                    <Badge variant="outline" className="ml-1 text-[10px]">admin</Badge>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {sessionUserId && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              logout();
              toast.success("Sesión cerrada");
            }}
          >
            <LogOut className="mr-1.5 h-4 w-4" /> Salir
          </Button>
        )}
      </div>
    </header>
  );
}
