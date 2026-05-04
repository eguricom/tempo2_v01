import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Toaster } from "@/components/ui/sonner";
import { LoginOverlay } from "@/components/LoginOverlay";

import appCss from "../styles.css?url";

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
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Tempo — Gestión de tiempo de empleados" },
      { name: "description", content: "Aplicación para registrar jornadas, ausencias y gestionar el tiempo de tu equipo." },
      { property: "og:title", content: "Tempo — Gestión de tiempo de empleados" },
      { name: "twitter:title", content: "Tempo — Gestión de tiempo de empleados" },
      { property: "og:description", content: "Aplicación para registrar jornadas, ausencias y gestionar el tiempo de tu equipo." },
      { name: "twitter:description", content: "Aplicación para registrar jornadas, ausencias y gestionar el tiempo de tu equipo." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/723fb91e-f315-4436-b16d-90abcfefc455/id-preview-4a6ed2b0--52a8fec1-4d93-4f07-b74b-318b72b521bd.lovable.app-1777876834257.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/723fb91e-f315-4436-b16d-90abcfefc455/id-preview-4a6ed2b0--52a8fec1-4d93-4f07-b74b-318b72b521bd.lovable.app-1777876834257.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <SidebarProvider>
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
