import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Receipt, TrendingUp, DollarSign, Plus, FileSpreadsheet, BarChart3 } from "lucide-react";
import Layout from "@/components/Layout";
import { useRequireAuth } from "@/hooks/useAuth";

export default function Dashboard() {
  const { user, loading: authLoading } = useRequireAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalTransactions: 0,
    balance: 0,
    thisMonth: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadStats();
    }
  }, [user]);

  const loadStats = async () => {
    try {
      // Get total transactions count
      const { count: totalCount } = await supabase
        .from("transactions")
        .select("*", { count: "exact", head: true })
        .is("deleted_at", null);

      // Get current month transactions
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const { data: monthTransactions } = await supabase
        .from("transactions")
        .select("type, total")
        .is("deleted_at", null)
        .gte("date", firstDayOfMonth.toISOString().split("T")[0]);

      let monthIncome = 0;
      let monthExpense = 0;

      monthTransactions?.forEach((t) => {
        if (t.type === "income") monthIncome += Number(t.total);
        if (t.type === "expense") monthExpense += Number(t.total);
      });

      // Get all time balance
      const { data: allTransactions } = await supabase
        .from("transactions")
        .select("type, total")
        .is("deleted_at", null);

      let allIncome = 0;
      let allExpense = 0;

      allTransactions?.forEach((t) => {
        if (t.type === "income") allIncome += Number(t.total);
        if (t.type === "expense") allExpense += Number(t.total);
      });

      setStats({
        totalTransactions: totalCount || 0,
        balance: allIncome - allExpense,
        thisMonth: monthIncome - monthExpense,
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">
            Resumen de tu actividad financiera
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="shadow-elegant">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Transacciones
              </CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalTransactions}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Registros totales
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-elegant">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Balance</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                ${stats.balance.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Ingresos - Gastos (total)
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-elegant">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Este Mes</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${stats.thisMonth >= 0 ? "text-primary" : "text-destructive"}`}>
                ${stats.thisMonth.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Balance del mes actual
              </p>
            </CardContent>
          </Card>
        </div>

        <div>
          <h2 className="text-2xl font-semibold mb-4">Acciones Rápidas</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="shadow-elegant hover:shadow-lg transition-smooth cursor-pointer" onClick={() => navigate("/transactions/new")}>
              <CardHeader>
                <div className="flex items-center space-x-4">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <Plus className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Nuevo Movimiento</CardTitle>
                    <CardDescription>Registrar transacción</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>

            <Card className="shadow-elegant hover:shadow-lg transition-smooth cursor-pointer" onClick={() => navigate("/transactions")}>
              <CardHeader>
                <div className="flex items-center space-x-4">
                  <div className="p-3 rounded-lg bg-secondary/10">
                    <Receipt className="h-6 w-6 text-secondary" />
                  </div>
                  <div>
                    <CardTitle>Ver Transacciones</CardTitle>
                    <CardDescription>Revisar movimientos</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>

            <Card className="shadow-elegant hover:shadow-lg transition-smooth cursor-pointer" onClick={() => navigate("/export")}>
              <CardHeader>
                <div className="flex items-center space-x-4">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <FileSpreadsheet className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Exportar Datos</CardTitle>
                    <CardDescription>Descargar Excel</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
