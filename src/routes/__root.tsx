import { Outlet, Link, createRootRoute } from "@tanstack/react-router";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Toaster } from "@/components/ui/sonner";
import { LoginOverlay } from "@/components/LoginOverlay";
import { AppearanceProvider } from "@/components/AppearanceProvider";
import { useEffect, useRef } from "react";
import { useAppStore, loadFromServer, forceSave, stateToJSON, apiUrl } from "@/lib/store";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Página no encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          La página que buscas no existe o ha sido movida.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Ir al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function DataLoader() {
  useEffect(() => { loadFromServer(); }, []);
  return null;
}

function RootComponent() {
  return (
    <SidebarProvider>
      <DataLoader />
      <AppearanceProvider />
      <DevModeWatcher />
      <UnsavedChangesGuard />
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <Outlet />
        </div>
      </div>
      <Toaster />
      <LoginOverlay />
    </SidebarProvider>
  );
}

function DevModeWatcher() {
  const { devMode, pingDevActivity, checkDevTimeout } = useAppStore();
  useEffect(() => {
    if (!devMode) return;
    const onActivity = () => pingDevActivity();
    window.addEventListener("click", onActivity);
    window.addEventListener("keydown", onActivity);
    const interval = window.setInterval(() => checkDevTimeout(), 30_000);
    return () => {
      window.removeEventListener("click", onActivity);
      window.removeEventListener("keydown", onActivity);
      window.clearInterval(interval);
    };
  }, [devMode, pingDevActivity, checkDevTimeout]);
  return null;
}

function UnsavedChangesGuard() {
  const loadedRef = useRef(false);
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    const handler = (e: BeforeUnloadEvent) => {
      const curr = JSON.stringify(stateToJSON());
      try {
        navigator.sendBeacon(apiUrl("/api/data.php"), new Blob([curr], { type: "application/json" }));
      } catch {}
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);
  return null;
}
