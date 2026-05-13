import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAppStore, type AppearanceSettings } from "@/lib/store";
import { Palette, RotateCcw, Check, Upload, Clock, Timer } from "lucide-react";
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

interface FieldDef {
  key: keyof AppearanceSettings;
  label: string;
  group: string;
}

const FIELDS: FieldDef[] = [
  { key: "sidebarOnBg", label: "Fondo activo", group: "Sidebar" },
  { key: "sidebarOverBg", label: "Fondo hover", group: "Sidebar" },
  { key: "primaryBtnBg", label: "Fondo", group: "Principales" },
  { key: "secondaryBtnHover", label: "Fondo hover", group: "Secundarios" },
  { key: "sidebarColor", label: "Fondo del menú lateral", group: "Paneles" },
  { key: "backgroundColor", label: "Fondo general", group: "Paneles" },
  { key: "cardColor", label: "Fondo de tarjetas", group: "Paneles" },
];

const DEFAULTS: Record<string, string> = {
  sidebarOnBg: "#6366f1",
  sidebarOverBg: "#e8ecf4",
  primaryBtnBg: "#6366f1",
  secondaryBtnHover: "#eef2ff",
  sidebarColor: "#eef2f7",
  backgroundColor: "#fafafa",
  cardColor: "#ffffff",
};

function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function contrastText(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  const l = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return l > 0.5 ? "#020617" : "#ffffff";
}

interface VarMapping {
  bg: string;
  fg?: string;
}

const CSS_VAR_MAP: Record<string, VarMapping[]> = {
  sidebarOnBg: [{ bg: "--sidebar-primary", fg: "--sidebar-primary-foreground" }],
  sidebarOverBg: [{ bg: "--sidebar-accent", fg: "--sidebar-accent-foreground" }],
  primaryBtnBg: [{ bg: "--primary", fg: "--primary-foreground" }],
  secondaryBtnHover: [{ bg: "--accent", fg: "--accent-foreground" }],
  sidebarColor: [{ bg: "--sidebar" }],
  backgroundColor: [{ bg: "--background" }],
  cardColor: [{ bg: "--card" }],
};

let _styleEl: HTMLStyleElement | null = null;

function getStyleEl(): HTMLStyleElement {
  if (!_styleEl) {
    _styleEl = document.createElement("style");
    _styleEl.id = "tempo-appearance";
    document.head.appendChild(_styleEl);
  }
  return _styleEl;
}

function applyCSS(appearance: Partial<AppearanceSettings>) {
  const pairs: Record<string, string> = {};
  for (const [key, mappings] of Object.entries(CSS_VAR_MAP)) {
    const bgValue = appearance[key as keyof AppearanceSettings];
    if (bgValue) {
      for (const m of mappings) {
        pairs[m.bg] = bgValue;
        if (m.fg) {
          pairs[m.fg] = contrastText(bgValue);
        }
      }
    }
  }
  const parts = Object.entries(pairs).map(([k, v]) => `${k}: ${v} !important`);
  if (parts.length) {
    getStyleEl().textContent = `:root{${parts.join(";")}}`;
  } else {
    clearCSS();
  }
}

function clearCSS() {
  if (_styleEl) {
    _styleEl.remove();
    _styleEl = null;
  }
}

const GROUPS = [...new Set(FIELDS.map((f) => f.group))];

function AparienciaPage() {
  const { appearance, updateAppearance, companyLogo, updateCompanyLogo } = useAppStore();
  const [draft, setDraft] = useState<Partial<AppearanceSettings>>({ ...appearance });

  const getDraft = (key: keyof AppearanceSettings): string => {
    return draft[key] ?? DEFAULTS[key];
  };

  const handleChange = (key: keyof AppearanceSettings, value: string) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const handleApply = () => {
    applyCSS(draft);
    updateAppearance(draft);
    toast.success("Colores aplicados");
  };

  const resetAll = () => {
    clearCSS();
    setDraft({});
    const empty = {} as Record<string, undefined>;
    for (const key of Object.keys(DEFAULTS)) {
      empty[key] = undefined as unknown as string;
    }
    updateAppearance(empty as Partial<AppearanceSettings>);
    toast.success("Colores restablecidos");
  };

  useEffect(() => {
    applyCSS(appearance);
  }, []);

  const handleLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) { toast.error("Máx 1MB"); return; }
    const reader = new FileReader();
    reader.onload = () => updateCompanyLogo(reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <>
      <AppHeader title="Aspecto" />
      <main className="flex-1 space-y-4 sm:space-y-6 py-3 sm:py-6">
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <Palette className="h-4 w-4" /> Personalizar colores
            </CardTitle>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Elige los colores y pulsa "Aplicar" para ver los cambios en toda la aplicación.
              El color del texto se calcula automáticamente para máxima legibilidad.
            </p>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-6">
            {GROUPS.map((group) => (
              <div key={group}>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{group}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {FIELDS.filter((f) => f.group === group).map(({ key, label }) => (
                    <div key={key} className="grid gap-1 sm:gap-2">
                      <Label className="text-xs sm:text-sm">{label}</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="color"
                          value={getDraft(key)}
                          onChange={(e) => handleChange(key, e.target.value as never)}
                          className="w-10 h-8 sm:h-9 p-0.5 cursor-pointer"
                        />
                        <span className="text-[10px] sm:text-xs text-muted-foreground truncate">
                          {getDraft(key)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div className="flex flex-wrap gap-2 pt-2">
              <Button size="sm" onClick={handleApply}>
                <Check className="mr-1.5 h-3.5 w-3.5" /> Aplicar
              </Button>
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
              <div className="h-10 w-10 rounded-lg" style={{ background: getDraft("primaryBtnBg") }} />
              <div className="h-10 w-10 rounded-lg" style={{ background: getDraft("sidebarColor") }} />
              <div className="h-10 w-10 rounded-lg" style={{ background: getDraft("cardColor") }} />
              <div className="h-10 w-10 rounded-lg" style={{ background: getDraft("secondaryBtnHover") }} />
            </div>
            <p className="text-xs text-muted-foreground">
              <span className="inline-block w-16">Primario</span>
              <span className="inline-block w-16">Sidebar</span>
              <span className="inline-block w-16">Tarjetas</span>
              <span className="inline-block w-16">Secundario</span>
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Sidebar preview */}
              <div className="rounded-lg border p-3 space-y-1.5" style={{ background: getDraft("sidebarColor") }}>
                <p className="text-xs font-semibold mb-2">Sidebar</p>
                <div className="rounded-md px-2 py-1.5 text-xs" style={{ background: getDraft("sidebarOnBg"), color: contrastText(getDraft("sidebarOnBg")) }}>
                  Activo
                </div>
                <div className="rounded-md px-2 py-1.5 text-xs" style={{ background: getDraft("sidebarOverBg"), color: contrastText(getDraft("sidebarOverBg")) }}>
                  Hover
                </div>
              </div>

              {/* Primary button preview */}
              <div className="rounded-lg border p-3 space-y-2">
                <p className="text-xs font-semibold">Principales</p>
                <button className="rounded-md px-3 py-1.5 text-xs font-medium w-full" style={{ background: getDraft("primaryBtnBg"), color: contrastText(getDraft("primaryBtnBg")) }}>
                  Botón primario
                </button>
              </div>

              {/* Secondary button preview */}
              <div className="rounded-lg border p-3 space-y-2">
                <p className="text-xs font-semibold">Secundarios</p>
                <button className="rounded-md px-3 py-1.5 text-xs font-medium w-full border" style={{ background: "transparent", borderColor: "var(--border)" }}>
                  Normal
                </button>
                <button className="rounded-md px-3 py-1.5 text-xs font-medium w-full" style={{ background: getDraft("secondaryBtnHover"), color: contrastText(getDraft("secondaryBtnHover")) }}>
                  Hover
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-sm sm:text-base">Logotipo de empresa</CardTitle>
            <p className="text-xs sm:text-sm text-muted-foreground">Se muestra en la pantalla de inicio de sesión y en el encabezado.</p>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
              <div className="relative flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center shrink-0">
                <div className="flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center overflow-hidden rounded-full border-2 border-blue-500 bg-primary text-primary-foreground">
                  {companyLogo ? (
                    <img src={companyLogo} alt="Logo empresa" className="h-full w-full object-cover" />
                  ) : (
                    <Clock className="h-6 w-6 sm:h-8 sm:w-8" />
                  )}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full border-2 border-blue-500 bg-primary text-primary-foreground shadow-sm">
                  <Timer className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                </div>
              </div>
              <div className="flex-1 min-w-[120px]">
                <p className="text-xs sm:text-sm font-medium">Logo actual</p>
                <p className="text-xs text-muted-foreground">JPG/PNG hasta 1MB.</p>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-1 sm:gap-2 rounded-md border bg-background px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm hover:bg-muted">
                <Upload className="h-3 w-3 sm:h-4 sm:w-4" /> Subir
                <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleLogo} />
              </label>
              {companyLogo && (
                <Button variant="ghost" size="sm" onClick={() => updateCompanyLogo("")} className="h-7 sm:h-8 text-xs sm:text-sm">Quitar</Button>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
