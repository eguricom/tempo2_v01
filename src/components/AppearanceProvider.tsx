import { useEffect } from "react";
import { useAppStore, type AppearanceSettings } from "@/lib/store";

interface VarMapping { bg: string; fg?: string }

const VAR_MAP: Record<string, VarMapping[]> = {
  sidebarOnBg: [{ bg: "--sidebar-primary", fg: "--sidebar-primary-foreground" }],
  sidebarOverBg: [{ bg: "--sidebar-accent", fg: "--sidebar-accent-foreground" }],
  primaryBtnBg: [{ bg: "--primary", fg: "--primary-foreground" }],
  secondaryBtnHover: [{ bg: "--accent", fg: "--accent-foreground" }],
  sidebarColor: [{ bg: "--sidebar" }],
  backgroundColor: [{ bg: "--background" }],
  cardColor: [{ bg: "--card" }],
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

function getStyleEl(): HTMLStyleElement {
  let el = document.getElementById("tempo-appearance") as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.id = "tempo-appearance";
    document.head.appendChild(el);
  }
  return el;
}

export function AppearanceProvider() {
  const appearance = useAppStore((s) => s.appearance);

  useEffect(() => {
    const pairs: Record<string, string> = {};
    for (const [key, mappings] of Object.entries(VAR_MAP)) {
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
    const parts = Object.entries(pairs).map(([k, v]) => `${k}: ${v}`);
    if (parts.length) {
      getStyleEl().textContent = `:root{${parts.join(";")}}`;
    } else {
      const el = document.getElementById("tempo-appearance");
      if (el) el.textContent = "";
    }
  }, [appearance]);

  return null;
}
