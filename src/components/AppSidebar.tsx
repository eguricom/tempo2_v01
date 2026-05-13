import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Clock, Plane, Users, Settings, Timer, CalendarDays, Sun, Moon, HardDrive, BookOpen, LogOut, Palette } from "lucide-react";
import { useState, useEffect } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAppStore } from "@/lib/store";
import { toast } from "sonner";

const items = [
  { title: "Inicio", url: "/", icon: Home },
  { title: "Jornadas", url: "/jornadas", icon: Clock },
  { title: "Vacaciones y festivos", url: "/vacaciones", icon: CalendarDays },
  { title: "Ausencias", url: "/ausencias", icon: Plane },
  { title: "Usuarios", url: "/usuarios", icon: Users },
  { title: "Configuración", url: "/configuracion", icon: Settings },
  { title: "Aspecto", url: "/apariencia", icon: Palette },
];

export function AppSidebar() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const [dark, setDark] = useState(() => localStorage.getItem("tempo-theme") === "dark");
  const { devMode, sessionUserId, logout } = useAppStore();
  const { isMobile, setOpenMobile } = useSidebar();
  const closeMobile = () => { if (isMobile) setOpenMobile(false); };

  const allItems = devMode
    ? [...items, { title: "Copias de seguridad", url: "/copias-seguridad", icon: HardDrive }]
    : items;

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("tempo-theme", dark ? "dark" : "light");
  }, [dark]);

  const toggleTheme = () => setDark((d) => !d);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-2 px-2 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Timer className="h-4 w-4" />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold">Tempo</span>
            <span className="text-xs text-muted-foreground">Gestión de tiempo</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menú</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {allItems.map((item) => {
                const active = item.url === "/" ? path === "/" : path.startsWith(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={active}>
                      <Link to={item.url} onClick={closeMobile} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t p-3 space-y-1">
        <div className="group-data-[collapsible=icon]:hidden px-2 py-1">
          <p className="text-[10px] text-muted-foreground leading-tight">By Molotov Cóctel Creativo SLU</p>
        </div>
        {sessionUserId && (
          <button
            onClick={() => { logout(); toast.success("Sesión cerrada"); }}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            title="Cerrar sesión"
          >
            <LogOut className="h-4 w-4" />
            <span className="group-data-[collapsible=icon]:hidden">Cerrar sesión</span>
          </button>
        )}
        <a
          href="/manual.html"
          target="_blank"
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          title="Tutorial"
        >
          <BookOpen className="h-4 w-4" />
          <span className="group-data-[collapsible=icon]:hidden">Tutorial</span>
        </a>
        <button
          onClick={toggleTheme}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          title={dark ? "Modo claro" : "Modo oscuro"}
        >
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          <span className="group-data-[collapsible=icon]:hidden">{dark ? "Modo claro" : "Modo oscuro"}</span>
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
