import { useMemo } from "react";

export type ThemeDefinition = {
  label: string;
  vars?: Record<string, string>;
};

export const themeDefinitions = {
  system: {
    label: "System (auto)",
  },
  "vela-classic": {
    label: "Vela Classic",
    vars: {
      "--bg": "#FFFFFF",
      "--surface": "#F8FAFC",
      "--text": "#0F172A",
      "--muted": "#94A3B8",
      "--accent": "#4ADE80",
      "--accent-contrast": "#0B1F0F",
      "--accentAlt": "#3B82F6",
      "--success": "#16A34A",
      "--danger": "#EF4444",
      "--warning": "#F59E0B",
      "--border": "#E5E7EB",
      "--ring": "#60A5FA",
      "--chart-1": "var(--accent)",
      "--chart-2": "var(--accentAlt)",
      "--chart-3": "#94A3B8",
      "--chart-4": "#F59E0B",
      "--chart-5": "#EF4444",
    },
  },
  "vela-graphite": {
    label: "Vela Graphite",
    vars: {
      "--bg": "#F6F7F9",
      "--surface": "#FFFFFF",
      "--text": "#0B1220",
      "--muted": "#6B7280",
      "--accent": "#22C55E",
      "--accent-contrast": "#0B1F0F",
      "--accentAlt": "#2563EB",
      "--success": "#16A34A",
      "--danger": "#EF4444",
      "--warning": "#F59E0B",
      "--border": "#E5E7EB",
      "--ring": "#60A5FA",
      "--chart-1": "var(--accent)",
      "--chart-2": "var(--accentAlt)",
      "--chart-3": "#64748B",
      "--chart-4": "#F59E0B",
      "--chart-5": "#EF4444",
    },
  },
  "vela-ocean": {
    label: "Vela Ocean",
    vars: {
      "--bg": "#F5F9FF",
      "--surface": "#FFFFFF",
      "--text": "#0B1220",
      "--muted": "#6A7A90",
      "--accent": "#3B82F6",
      "--accent-contrast": "#0B1220",
      "--accentAlt": "#22D3EE",
      "--success": "#16A34A",
      "--danger": "#EF4444",
      "--warning": "#F59E0B",
      "--border": "#E5E7EB",
      "--ring": "#60A5FA",
      "--chart-1": "var(--accent)",
      "--chart-2": "var(--accentAlt)",
      "--chart-3": "#9CA3AF",
      "--chart-4": "#F59E0B",
      "--chart-5": "#EF4444",
    },
  },
  "vela-sand": {
    label: "Vela Sand",
    vars: {
      "--bg": "#FFFCF7",
      "--surface": "#FFFFFF",
      "--text": "#1C1917",
      "--muted": "#A8A29E",
      "--accent": "#10B981",
      "--accent-contrast": "#072014",
      "--accentAlt": "#F59E0B",
      "--success": "#16A34A",
      "--danger": "#DC2626",
      "--warning": "#D97706",
      "--border": "#E7E5E4",
      "--ring": "#60A5FA",
      "--chart-1": "var(--accent)",
      "--chart-2": "var(--accentAlt)",
      "--chart-3": "#A8A29E",
      "--chart-4": "#F59E0B",
      "--chart-5": "#EF4444",
    },
  },
  "vela-noir": {
    label: "Vela Noir",
    vars: {
      "--bg": "#0B1020",
      "--surface": "#111827",
      "--text": "#E5E7EB",
      "--muted": "#9CA3AF",
      "--accent": "#4ADE80",
      "--accent-contrast": "#0B1F0F",
      "--accentAlt": "#60A5FA",
      "--success": "#22C55E",
      "--danger": "#F87171",
      "--warning": "#F59E0B",
      "--border": "#1F2937",
      "--ring": "#60A5FA",
      "--chart-1": "var(--accent)",
      "--chart-2": "var(--accentAlt)",
      "--chart-3": "#9CA3AF",
      "--chart-4": "#F59E0B",
      "--chart-5": "#F87171",
    },
  },
  "vela-midnight": {
    label: "Vela Midnight",
    vars: {
      "--bg": "#000000",
      "--surface": "#0B0F14",
      "--text": "#E6EAF0",
      "--muted": "#8A93A5",
      "--accent": "#38D39F",
      "--accent-contrast": "#071510",
      "--accentAlt": "#7AA2FF",
      "--success": "#22C55E",
      "--danger": "#F87171",
      "--warning": "#F59E0B",
      "--border": "#141820",
      "--ring": "#7AA2FF",
      "--chart-1": "var(--accent)",
      "--chart-2": "var(--accentAlt)",
      "--chart-3": "#8A93A5",
      "--chart-4": "#F59E0B",
      "--chart-5": "#F87171",
    },
  },
  "vela-slate": {
    label: "Vela Slate",
    vars: {
      "--bg": "#F1F5F9",
      "--surface": "#FFFFFF",
      "--text": "#0F172A",
      "--muted": "#64748B",
      "--accent": "#22C55E",
      "--accent-contrast": "#0B1F0F",
      "--accentAlt": "#0EA5E9",
      "--success": "#16A34A",
      "--danger": "#EF4444",
      "--warning": "#F59E0B",
      "--border": "#E2E8F0",
      "--ring": "#60A5FA",
      "--chart-1": "var(--accent)",
      "--chart-2": "var(--accentAlt)",
      "--chart-3": "#94A3B8",
      "--chart-4": "#F59E0B",
      "--chart-5": "#EF4444",
    },
  },
  "vela-blossom": {
    label: "Vela Blossom",
    vars: {
      "--bg": "#FAFBFF",
      "--surface": "#FFFFFF",
      "--text": "#111827",
      "--muted": "#9AA3B2",
      "--accent": "#4ADE80",
      "--accent-contrast": "#0B1F0F",
      "--accentAlt": "#A78BFA",
      "--success": "#16A34A",
      "--danger": "#EF4444",
      "--warning": "#F59E0B",
      "--border": "#E5E7EB",
      "--ring": "#60A5FA",
      "--chart-1": "var(--accent)",
      "--chart-2": "var(--accentAlt)",
      "--chart-3": "#9AA3B2",
      "--chart-4": "#F59E0B",
      "--chart-5": "#EF4444",
    },
  },
} as const;

export type ThemeKey = keyof typeof themeDefinitions;
export type ConcreteThemeKey = Exclude<ThemeKey, "system">;

const hexToHsl = (hex: string): string => {
  const sanitized = hex.replace("#", "");
  const bigint = parseInt(sanitized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;

  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;

  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rNorm:
        h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0);
        break;
      case gNorm:
        h = (bNorm - rNorm) / d + 2;
        break;
      case bNorm:
        h = (rNorm - gNorm) / d + 4;
        break;
    }
    h /= 6;
  }

  const hDeg = Math.round(h * 360);
  const sPerc = Math.round(s * 100);
  const lPerc = Math.round(l * 100);

  return `${hDeg} ${sPerc}% ${lPerc}%`;
};

const safeHexToHsl = (value?: string): string | undefined => {
  if (!value) return undefined;
  if (!value.startsWith("#")) return undefined;
  return hexToHsl(value);
};

const applyDesignTokens = (vars: Record<string, string>) => {
  if (typeof document === "undefined") return;
  const doc = document.documentElement;

  const bg = safeHexToHsl(vars["--bg"]);
  const surface = safeHexToHsl(vars["--surface"]);
  const text = safeHexToHsl(vars["--text"]);
  const muted = safeHexToHsl(vars["--muted"]);
  const accent = safeHexToHsl(vars["--accent"]);
  const accentContrast = safeHexToHsl(vars["--accent-contrast"]);
  const accentAlt = safeHexToHsl(vars["--accentAlt"]);
  const border = safeHexToHsl(vars["--border"]);
  const ring = safeHexToHsl(vars["--ring"]);
  const danger = safeHexToHsl(vars["--danger"]);
  const warning = safeHexToHsl(vars["--warning"]);
  const success = safeHexToHsl(vars["--success"]);

  if (bg) doc.style.setProperty("--background", bg);
  if (text) doc.style.setProperty("--foreground", text);
  if (surface) {
    doc.style.setProperty("--card", surface);
    doc.style.setProperty("--popover", surface);
  }
  if (text) {
    doc.style.setProperty("--card-foreground", text);
    doc.style.setProperty("--popover-foreground", text);
  }
  if (accent) {
    doc.style.setProperty("--primary", accent);
    doc.style.setProperty("--accent", accent);
  }
  if (accentContrast) {
    doc.style.setProperty("--primary-foreground", accentContrast);
    doc.style.setProperty("--accent-foreground", accentContrast);
  }
  if (accentAlt) {
    doc.style.setProperty("--secondary", accentAlt);
  }
  if (text) {
    doc.style.setProperty("--secondary-foreground", text);
  }
  if (muted) {
    doc.style.setProperty("--muted", muted);
    doc.style.setProperty("--sidebar-accent", muted);
  }
  if (text) {
    doc.style.setProperty("--muted-foreground", text);
  }
  if (danger) {
    doc.style.setProperty("--destructive", danger);
  }
  if (accentContrast) {
    doc.style.setProperty("--destructive-foreground", accentContrast);
  }
  if (border) {
    doc.style.setProperty("--border", border);
    doc.style.setProperty("--input", border);
    doc.style.setProperty("--sidebar-border", border);
  }
  if (ring) {
    doc.style.setProperty("--ring", ring);
    doc.style.setProperty("--sidebar-ring", ring);
  }
  if (surface) {
    doc.style.setProperty("--sidebar-background", surface);
  }
  if (text) {
    doc.style.setProperty("--sidebar-foreground", text);
    doc.style.setProperty("--sidebar-primary-foreground", accentContrast ?? text);
    doc.style.setProperty("--sidebar-accent-foreground", text);
  }
  if (accent) {
    doc.style.setProperty("--sidebar-primary", accent);
  }
  if (success) {
    doc.style.setProperty("--success", success);
  }
  if (warning) {
    doc.style.setProperty("--warning", warning);
  }
};

const setThemeVariables = (themeKey: ConcreteThemeKey) => {
  if (typeof document === "undefined") return;
  const theme = themeDefinitions[themeKey];
  if (!theme.vars) return;

  const doc = document.documentElement;
  Object.entries(theme.vars).forEach(([key, value]) => {
    doc.style.setProperty(key, value);
  });
  applyDesignTokens(theme.vars);
};

export const resolveSystemTheme = (): ConcreteThemeKey => {
  if (typeof window === "undefined") {
    return "vela-classic";
  }
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  return prefersDark ? "vela-noir" : "vela-classic";
};

export const applyThemeToDocument = (themeKey: ThemeKey) => {
  if (typeof document === "undefined") return;
  const doc = document.documentElement;
  if (themeKey === "system") {
    doc.setAttribute("data-theme", "system");
    setThemeVariables(resolveSystemTheme());
  } else {
    doc.setAttribute("data-theme", themeKey);
    setThemeVariables(themeKey);
  }
};

export const useThemeOptions = () =>
  useMemo(
    () =>
      Object.entries(themeDefinitions).map(([value, definition]) => ({
        value: value as ThemeKey,
        label: definition.label,
      })),
    []
  );
