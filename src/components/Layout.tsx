import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut, Receipt, TrendingUp, FileDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import velaLogo from "@/assets/vela-logo.png";
import { User } from "@supabase/supabase-js";

interface LayoutProps {
  children: ReactNode;
  user?: User | null;
}

export default function Layout({ children, user }: LayoutProps) {
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
    <div className="min-h-screen">
      <nav className="border-b bg-card shadow-sm">
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
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    className="flex items-center gap-3 rounded-full border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {user.email?.charAt(0).toUpperCase() ?? "U"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:inline">{user.email}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Mi cuenta</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={() => {
                      navigate("/profile");
                    }}
                  >
                    Perfil
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => {
                      navigate("/profile/appearance");
                    }}
                  >
                    Apariencia
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={() => {
                      handleSignOut();
                    }}
                    className="text-destructive focus:text-destructive"
                  >
                    <LogOut className="mr-2 h-4 w-4" /> Salir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button type="button" variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Salir
              </Button>
            )}
          </div>
        </div>
      </nav>
      <main className="container mx-auto px-4 py-8">{children}</main>
      <footer className="border-t bg-card py-4 mt-8">
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
