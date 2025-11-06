import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, Receipt, TrendingUp, FileDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import velaLogo from "@/assets/vela-logo.png";
import { ThemeSettings } from "@/components/ThemeSettings";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Sesión cerrada",
      description: "Has cerrado sesión correctamente.",
    });
    navigate("/auth");
  };

  const navItems = [
    { path: "/", label: "Dashboard", icon: TrendingUp },
    { path: "/transactions", label: "Transacciones", icon: Receipt },
    { path: "/cashflow", label: "Flujos de Efectivo", icon: TrendingUp },
    { path: "/export", label: "Exportar", icon: FileDown },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <nav className="border-b bg-white shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center space-x-8">
              <Link to="/" className="flex items-center">
                <img src={velaLogo} alt="Vela Digital" className="h-10" />
              </Link>
              <div className="hidden md:flex space-x-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-smooth ${
                        isActive
                          ? "bg-emerald-500 text-white shadow-sm"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeSettings />
              <Button variant="outline" size="sm" onClick={handleSignOut} className="rounded-full border-slate-200">
                <LogOut className="h-4 w-4 mr-2" />
                Salir
              </Button>
            </div>
          </div>
        </div>
      </nav>
      <main className="container mx-auto px-4 py-8 flex-1 w-full">{children}</main>
      <footer className="border-t bg-card py-4 mt-auto w-full">
        <div className="container mx-auto px-4">
          <a
            href="https://veladigital.mx/"
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center justify-center space-x-2 hover:opacity-80 transition-opacity"
          >
            <span className="text-sm text-muted-foreground">Powered By</span>
            <img src={velaLogo} alt="Vela Digital" className="h-6" />
          </a>
        </div>
      </footer>
    </div>
  );
}
