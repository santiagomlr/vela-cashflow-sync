import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { useRequireAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, Eye, Edit, Copy, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function Transactions() {
  const { user, loading: authLoading } = useRequireAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    if (user) {
      loadTransactions();
    }
  }, [user, filter]);

  const loadTransactions = async () => {
    try {
      let query = supabase
        .from("transactions")
        .select("*")
        .is("deleted_at", null)
        .order("date", { ascending: false });

      if (filter !== "all") {
        query = query.eq("type", filter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error("Error loading transactions:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar las transacciones.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, status: string) => {
    try {
      if (status === "draft") {
        // Hard delete for drafts
        const { error } = await supabase
          .from("transactions")
          .delete()
          .eq("id", id);

        if (error) throw error;
      } else {
        // Soft delete for posted/pending
        const { error } = await supabase
          .from("transactions")
          .update({ deleted_at: new Date().toISOString() })
          .eq("id", id);

        if (error) throw error;
      }

      toast({
        title: "Eliminado",
        description: "La transacción ha sido eliminada.",
      });
      loadTransactions();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Transacciones</h1>
            <p className="text-muted-foreground">
              Registros de Ingresos y Gastos
            </p>
          </div>
          <Button onClick={() => navigate("/transactions/new")}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Movimiento
          </Button>
        </div>

        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList>
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="income">Ingresos</TabsTrigger>
            <TabsTrigger value="expense">Gastos</TabsTrigger>
          </TabsList>
        </Tabs>

        <Card className="shadow-elegant">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Concepto</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No hay transacciones registradas
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      {new Date(transaction.date).toLocaleDateString("es-MX")}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          transaction.type === "income"
                            ? "default"
                            : transaction.type === "expense"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {transaction.type === "income"
                          ? "Ingreso"
                          : transaction.type === "expense"
                          ? "Egreso"
                          : "Transferencia"}
                      </Badge>
                    </TableCell>
                    <TableCell>{transaction.concept}</TableCell>
                    <TableCell>{transaction.category || "-"}</TableCell>
                    <TableCell className="text-right font-mono">
                      ${Number(transaction.total).toLocaleString("es-MX", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {transaction.status === "draft"
                          ? "Borrador"
                          : transaction.status === "posted"
                          ? "Publicado"
                          : "Pendiente"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(transaction.id, transaction.status)}
                        disabled={transaction.reconciled}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </Layout>
  );
}
