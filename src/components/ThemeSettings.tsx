import { Check, Palette, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTheme, THEME_OPTIONS, ThemeId } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";

export function ThemeSettings() {
  const { theme, setTheme } = useTheme();
  const activeTheme = THEME_OPTIONS.find((option) => option.id === theme);

  const handleSelect = (value: ThemeId) => {
    setTheme(value);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-2 rounded-full border-border text-foreground/80 hover:text-foreground"
        >
          <Settings2 className="h-4 w-4" />
          <span className="text-xs font-semibold flex items-center gap-1">
            {activeTheme && (
              <span aria-hidden className="text-sm">
                {activeTheme.emoji}
              </span>
            )}
            {activeTheme?.name ?? "Tema"}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="flex items-center gap-2 pb-3 border-b">
          <Palette className="h-5 w-5 text-primary" />
          <div>
            <p className="text-sm font-semibold">Personaliza tu apariencia</p>
            <p className="text-xs text-muted-foreground">
              Cambia la paleta visual sin afectar el encabezado.
            </p>
          </div>
        </div>
        <ScrollArea className="mt-3 h-64 pr-2">
          <div className="space-y-2">
            {THEME_OPTIONS.map((option) => {
              const isActive = option.id === theme;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleSelect(option.id)}
                  className={cn(
                    "w-full rounded-xl border px-3 py-3 text-left transition-smooth",
                    isActive
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/60 hover:bg-primary/5"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg" aria-hidden>
                      {option.emoji}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-sm text-foreground">{option.name}</p>
                        {isActive && <Check className="h-4 w-4 text-primary" />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{option.description}</p>
                      <div className="mt-2 flex items-center gap-1">
                        <span
                          className="h-2 w-6 rounded-full"
                          style={{ background: option.preview.background }}
                        />
                        <span
                          className="h-2 w-6 rounded-full"
                          style={{ background: option.preview.surface }}
                        />
                        <span
                          className="h-2 w-6 rounded-full"
                          style={{ background: option.preview.accent }}
                        />
                        <span
                          className="h-2 w-6 rounded-full"
                          style={{ background: option.preview.accentAlt }}
                        />
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
