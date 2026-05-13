import { useEffect } from "react";
import { useAppStore, type AppearanceSettings } from "@/lib/store";

const VAR_MAP: Record<keyof AppearanceSettings, string> = {
  primaryColor: "--primary",
  sidebarColor: "--sidebar",
  backgroundColor: "--background",
  cardColor: "--card",
  accentColor: "--accent",
  boxColor: "--sidebar-primary",
};

export function AppearanceProvider() {
  const appearance = useAppStore((s) => s.appearance);

  useEffect(() => {
    const root = document.documentElement;
    for (const [key, cssVar] of Object.entries(VAR_MAP)) {
      const value = appearance[key as keyof AppearanceSettings];
      if (value) {
        root.style.setProperty(cssVar, value);
      } else {
        root.style.removeProperty(cssVar);
      }
    }
  }, [appearance]);

  return null;
}
