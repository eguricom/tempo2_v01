import { createFileRoute } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAppStore, type AppearanceSettings } from "@/lib/store";
import { Palette, RotateCcw } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/apariencia")({
  head: () => ({
    meta: [
      { title: "Aspecto — Tempo" },
      { name: "description", content: "Personaliza la apariencia de la aplicación." },
    ],
  }),
  component: AparienciaPage,
});

const FIELDS: { key: keyof AppearanceSettings; label: string }[] = [
  { key: "primaryColor", label: "Color primario" },
  { key: "sidebarColor", label: "Fondo del menú lateral" },
  { key: "backgroundColor", label: "Fondo general" },
  { key: "cardColor", label: "Fondo de tarjetas" },
  { key: "accentColor", label: "Color de resalte" },
  { key: "boxColor", label: "Color de perfiles/cajas" },
];

const DEFAULTS: Record<string, string> = {
  primaryColor: "#6366f1",
  sidebarColor: "#eef2f7",
  backgroundColor: "#fafafa",
  cardColor: "#ffffff",
  accentColor: "#eef2ff",
  boxColor: "#6366f1",
};

function AparienciaPage() {
  const { appearance, updateAppearance } = useAppStore();

  const getValue = (key: keyof AppearanceSettings): string => {
    return appearance[key] ?? DEFAULTS[key];
  };

  const handleChange = (key: keyof AppearanceSettings, value: string) => {
    updateAppearance({ [key]: value });
  };

  const resetAll = () => {
    updateAppearance({
      primaryColor: undefined as unknown as string,
      sidebarColor: undefined as unknown as string,
      backgroundColor: undefined as unknown as string,
      cardColor: undefined as unknown as string,
      accentColor: undefined as unknown as string,
      boxColor: undefined as unknown as string,
    });
    toast.success("Colores restablecidos");
  };

  return (
    <>
      <AppHeader title="Aspecto" />
      <main className="flex-1 space-y-4 sm:space-y-6 p-3 sm:p-6">
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <Palette className="h-4 w-4" /> Personalizar colores
            </CardTitle>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Los cambios se ven en tiempo real. Se guardan automáticamente.
            </p>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {FIELDS.map(({ key, label }) => (
                <div key={key} className="grid gap-1 sm:gap-2">
                  <Label className="text-xs sm:text-sm">{label}</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="color"
                      value={getValue(key)}
                      onChange={(e) => handleChange(key, e.target.value)}
                      className="w-10 h-8 sm:h-9 p-0.5 cursor-pointer"
                    />
                    <span className="text-[10px] sm:text-xs text-muted-foreground truncate">
                      {getValue(key)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={resetAll}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Restablecer valores
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-sm sm:text-base">Vista previa</CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-4">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="h-10 w-10 rounded-lg" style={{ background: getValue("primaryColor") }} />
              <div className="h-10 w-10 rounded-lg" style={{ background: getValue("sidebarColor") }} />
              <div className="h-10 w-10 rounded-lg" style={{ background: getValue("cardColor") }} />
              <div className="h-10 w-10 rounded-lg" style={{ background: getValue("accentColor") }} />
              <div className="h-10 w-10 rounded-full" style={{ background: getValue("boxColor") }} />
            </div>
            <p className="text-xs text-muted-foreground">
              <span className="inline-block w-16">Primario</span>
              <span className="inline-block w-16">Sidebar</span>
              <span className="inline-block w-16">Tarjetas</span>
              <span className="inline-block w-16">Resalte</span>
              <span className="inline-block w-16">Perfiles</span>
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-lg border p-3 sm:p-4 space-y-2" style={{ background: getValue("cardColor"), borderColor: "var(--border)" }}>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: getValue("boxColor") }}>
                    T
                  </div>
                  <div>
                    <p className="text-sm font-medium">Tarjeta de ejemplo</p>
                    <p className="text-xs text-muted-foreground">Con colores personalizados</p>
                  </div>
                </div>
                <button className="rounded-md px-3 py-1.5 text-xs font-medium text-white" style={{ background: getValue("primaryColor") }}>
                  Botón primario
                </button>
                <button className="rounded-md px-3 py-1.5 text-xs font-medium" style={{ background: getValue("accentColor") }}>
                  Botón resalte
                </button>
              </div>

              <div className="rounded-lg border p-3 sm:p-4 space-y-2" style={{ background: getValue("sidebarColor") }}>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold text-white" style={{ background: getValue("primaryColor") }}>
                    T
                  </div>
                  <span className="text-sm font-semibold">Menú lateral</span>
                </div>
                <div className="space-y-1">
                  {["Inicio", "Jornadas", "Vacaciones"].map((item) => (
                    <div key={item} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs" style={{ background: getValue("accentColor") }}>
                      <div className="h-3 w-3 rounded" style={{ background: getValue("primaryColor") }} />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
