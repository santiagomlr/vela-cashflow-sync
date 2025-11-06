import { ReactNode, createContext, useContext, useEffect, useMemo, useState } from "react";

export type ThemeId =
  | "vela-classic"
  | "vela-graphite"
  | "vela-ocean"
  | "vela-sand"
  | "vela-noir"
  | "vela-midnight"
  | "vela-slate"
  | "vela-blossom";

export interface ThemeOption {
  id: ThemeId;
  name: string;
  description: string;
  emoji: string;
  preview: {
    background: string;
    surface: string;
    accent: string;
  };
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: "vela-classic",
    name: "Vela Classic",
    description: "Paleta insignia con verdes y zafiros.",
    emoji: "🎨",
    preview: {
      background: "oklch(0.98 0.003 260)",
      surface: "oklch(0.97 0.003 260)",
      accent: "oklch(0.8 0.15 150)",
    },
  },
  {
    id: "vela-graphite",
    name: "Vela Graphite",
    description: "Neutros suaves con acentos elegantes.",
    emoji: "⚙️",
    preview: {
      background: "oklch(0.95 0.005 250)",
      surface: "oklch(0.99 0.002 250)",
      accent: "oklch(0.75 0.15 145)",
    },
  },
  {
    id: "vela-ocean",
    name: "Vela Ocean",
    description: "Azules serenos inspirados en el mar.",
    emoji: "🌊",
    preview: {
      background: "oklch(0.97 0.02 240)",
      surface: "oklch(0.99 0.005 250)",
      accent: "oklch(0.68 0.14 240)",
    },
  },
  {
    id: "vela-sand",
    name: "Vela Sand",
    description: "Tonos cálidos y naturales.",
    emoji: "☀️",
    preview: {
      background: "oklch(0.98 0.03 90)",
      surface: "oklch(0.99 0.02 95)",
      accent: "oklch(0.75 0.14 150)",
    },
  },
  {
    id: "vela-noir",
    name: "Vela Noir",
    description: "Modo oscuro elegante y contrastado.",
    emoji: "🌑",
    preview: {
      background: "oklch(0.13 0.01 260)",
      surface: "oklch(0.16 0.01 260)",
      accent: "oklch(0.75 0.16 150)",
    },
  },
  {
    id: "vela-midnight",
    name: "Vela Midnight",
    description: "Oscuro profundo con destellos teal.",
    emoji: "🌌",
    preview: {
      background: "oklch(0.07 0.01 250)",
      surface: "oklch(0.1 0.008 260)",
      accent: "oklch(0.7 0.14 160)",
    },
  },
  {
    id: "vela-slate",
    name: "Vela Slate",
    description: "Grises suaves con acentos verdes.",
    emoji: "🪶",
    preview: {
      background: "oklch(0.96 0.01 250)",
      surface: "oklch(0.99 0.005 260)",
      accent: "oklch(0.75 0.14 150)",
    },
  },
  {
    id: "vela-blossom",
    name: "Vela Blossom",
    description: "Toques florales frescos y vibrantes.",
    emoji: "🌸",
    preview: {
      background: "oklch(0.98 0.01 280)",
      surface: "oklch(0.99 0.01 280)",
      accent: "oklch(0.8 0.16 150)",
    },
  },
];

interface ThemeContextValue {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
  options: ThemeOption[];
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const THEME_STORAGE_KEY = "vela-preferred-theme";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const getStoredTheme = () => {
    if (typeof window === "undefined") {
      return "vela-classic";
    }

    const stored = window.localStorage.getItem(THEME_STORAGE_KEY) as ThemeId | null;
    if (stored && THEME_OPTIONS.some((option) => option.id === stored)) {
      return stored;
    }

    return "vela-classic";
  };

  const [theme, setTheme] = useState<ThemeId>(getStoredTheme);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", theme);
    }
    if (typeof window !== "undefined") {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    }
  }, [theme]);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      options: THEME_OPTIONS,
    }),
    [theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
