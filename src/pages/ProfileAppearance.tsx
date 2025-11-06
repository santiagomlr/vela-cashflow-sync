import { useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useRequireAuth } from "@/hooks/useAuth";
import { useThemeContext } from "@/providers/ThemeProvider";
import { ThemePreviewTiles } from "@/components/profile/ThemePreviewTiles";
import { themeDefinitions, ThemeKey, useThemeOptions } from "@/lib/theme";

const ProfileAppearance = () => {
  const { user, loading: authLoading } = useRequireAuth();
  const { toast } = useToast();
  const options = useThemeOptions();
  const { theme, persistedTheme, loading, setTheme, saveTheme, resetTheme } = useThemeContext();
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  const handleThemeChange = (value: string) => {
    if (value in themeDefinitions) {
      setTheme(value as ThemeKey);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await saveTheme();
      toast({
        title: "Tema guardado",
        description: "La apariencia se ha actualizado correctamente.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "No se pudo guardar",
        description: error.message ?? "Intenta nuevamente más tarde.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      setResetting(true);
      await resetTheme();
      toast({
        title: "Tema restablecido",
        description: "Se ha vuelto al modo System.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "No se pudo restablecer",
        description: error.message ?? "Intenta nuevamente más tarde.",
      });
    } finally {
      setResetting(false);
    }
  };

  const isBusy = loading || authLoading;
  const hasChanges = theme !== persistedTheme;

  if (isBusy) {
    return (
      <Layout user={user}>
        <div className="flex h-64 items-center justify-center">
          <p className="text-muted-foreground">Cargando preferencias...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout user={user}>
      <div className="max-w-3xl space-y-8">
        <div>
          <h1 className="text-4xl font-bold">Apariencia</h1>
          <p className="text-muted-foreground">Personaliza el tema de Vela Ledger.</p>
        </div>

        <div className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Tema</h2>
            <p className="text-sm text-muted-foreground">
              Selecciona el estilo que mejor se adapte a tus preferencias y visualiza los cambios al instante.
            </p>
          </div>
          <Select value={theme} onValueChange={handleThemeChange}>
            <SelectTrigger className="w-full md:w-80">
              <SelectValue placeholder="Selecciona un tema" />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <ThemePreviewTiles />

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={handleSave} disabled={!hasChanges || saving}>
            {saving ? "Guardando..." : "Guardar"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            disabled={resetting}
          >
            {resetting ? "Restableciendo..." : "Restablecer a System"}
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default ProfileAppearance;
