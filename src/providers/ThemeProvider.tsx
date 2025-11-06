import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { applyThemeToDocument, themeDefinitions, ThemeKey } from "@/lib/theme";

interface ThemeContextValue {
  theme: ThemeKey;
  persistedTheme: ThemeKey;
  loading: boolean;
  setTheme: (theme: ThemeKey) => void;
  saveTheme: () => Promise<void>;
  resetTheme: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const isBrowser = typeof window !== "undefined";

type Listener = ((event: MediaQueryListEvent) => void) | null;

type ThemeProviderProps = {
  children: ReactNode;
};

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const [theme, setThemeState] = useState<ThemeKey>("system");
  const [persistedTheme, setPersistedTheme] = useState<ThemeKey>("system");
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const systemMediaQueryRef = useRef<MediaQueryList | null>(null);
  const systemListenerRef = useRef<Listener>(null);

  const removeSystemListener = useCallback(() => {
    if (systemMediaQueryRef.current && systemListenerRef.current) {
      systemMediaQueryRef.current.removeEventListener("change", systemListenerRef.current);
    }
    systemMediaQueryRef.current = null;
    systemListenerRef.current = null;
  }, []);

  useEffect(() => {
    if (!isBrowser) return;

    removeSystemListener();
    applyThemeToDocument(theme);

    if (theme === "system") {
      const query = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => applyThemeToDocument("system");
      query.addEventListener("change", handler);
      systemMediaQueryRef.current = query;
      systemListenerRef.current = handler;
    }

    return () => {
      removeSystemListener();
    };
  }, [theme, removeSystemListener]);

  const ensureValidTheme = useCallback((value: string | null | undefined): ThemeKey => {
    if (!value) return "system";
    return value in themeDefinitions ? (value as ThemeKey) : "system";
  }, []);

  const loadThemeForUser = useCallback(
    async (uid: string | null) => {
      if (!uid) {
        setThemeState("system");
        setPersistedTheme("system");
        setLoading(false);
        return;
      }

      setLoading(true);

      const { data, error } = await supabase
        .from("users")
        .select("theme")
        .eq("id", uid)
        .maybeSingle();

      if (error) {
        console.error("Error fetching user theme", error);
      }

      if (!data) {
        await supabase
          .from("users")
          .upsert({ id: uid, theme: "system" }, { onConflict: "id" });
        setThemeState("system");
        setPersistedTheme("system");
      } else {
        const nextTheme = ensureValidTheme(data.theme);
        setThemeState(nextTheme);
        setPersistedTheme(nextTheme);
      }

      setLoading(false);
    },
    [ensureValidTheme]
  );

  useEffect(() => {
    let active = true;

    const initialize = async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      const uid = data.session?.user?.id ?? null;
      setUserId(uid);
      await loadThemeForUser(uid);
    };

    initialize();

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      await loadThemeForUser(uid);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [loadThemeForUser]);

  const persistTheme = useCallback(
    async (themeKey: ThemeKey) => {
      if (!userId) {
        setPersistedTheme(themeKey);
        return;
      }

      const { error } = await supabase
        .from("users")
        .upsert({ id: userId, theme: themeKey }, { onConflict: "id" });

      if (error) {
        throw error;
      }

      setPersistedTheme(themeKey);
    },
    [userId]
  );

  const setTheme = useCallback((value: ThemeKey) => {
    setThemeState(value);
  }, []);

  const saveTheme = useCallback(async () => {
    await persistTheme(theme);
  }, [persistTheme, theme]);

  const resetTheme = useCallback(async () => {
    setThemeState("system");
    await persistTheme("system");
  }, [persistTheme]);

  const value: ThemeContextValue = {
    theme,
    persistedTheme,
    loading,
    setTheme,
    saveTheme,
    resetTheme,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useThemeContext = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useThemeContext must be used within a ThemeProvider");
  }
  return context;
};
