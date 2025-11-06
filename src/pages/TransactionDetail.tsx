import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { useRequireAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, Trash2, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function TransactionDetail() {
  const { id } = useParams();
  const { user, loading: authLoading } = useRequireAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [transaction, setTransaction] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && id) {
      loadTransaction();
    }
  }, [user, id]);

  const loadTransaction = async () => {
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("id", id)
        .is("deleted_at", null)
        .single();

      if (error) throw error;
      setTransaction(data);
    } catch (error) {
      console.error("Error loading transaction:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo cargar la transacción.",
      });
      navigate("/transactions");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!transaction) return;

    if (!confirm("¿Estás seguro de eliminar esta transacción?")) return;

    try {
      if (transaction.status === "draft") {
        // Hard delete for drafts
        const { error } = await supabase
          .from("transactions")
          .delete()
          .eq("id", transaction.id);

        if (error) throw error;
      } else {
        // Soft delete for posted/pending
        const { error } = await supabase
          .from("transactions")
          .update({ deleted_at: new Date().toISOString() })
          .eq("id", transaction.id);

        if (error) throw error;
      }

      toast({
        title: "Eliminado",
        description: "La transacción ha sido eliminada.",
      });
      navigate("/transactions");
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

  if (!transaction) {
    return null;
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={() => navigate("/transactions")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Detalle de Transacción</h1>
              <p className="text-muted-foreground">{transaction.concept}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={() => navigate(`/transactions/${transaction.id}/edit`)}
              disabled={transaction.reconciled}
            >
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={transaction.reconciled}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="shadow-elegant">
            <CardHeader>
              <CardTitle>Información General</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Tipo</p>
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
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fecha</p>
                <p className="font-medium">
                  {new Date(transaction.date).toLocaleDateString("es-MX")}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Estado</p>
                <Badge variant="outline">
                  {transaction.status === "draft"
                    ? "Borrador"
                    : transaction.status === "posted"
                    ? "Publicado"
                    : "Pendiente"}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Método</p>
                <p className="font-medium">
                  {transaction.method === "bank" ? "Banco" : "Efectivo"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Categoría</p>
                <p className="font-medium">{transaction.category || "-"}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-elegant">
            <CardHeader>
              <CardTitle>Montos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Monto Original</p>
                <p className="text-2xl font-mono font-bold">
                  ${Number(transaction.amount).toLocaleString("es-MX", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                <div>
                  <p className="text-sm text-muted-foreground">Subtotal</p>
                  <p className="font-mono">
                    ${Number(transaction.subtotal).toLocaleString("es-MX", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">IVA</p>
                  <p className="font-mono">
                    ${Number(transaction.vat_amount).toLocaleString("es-MX", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="font-mono font-bold">
                    ${Number(transaction.total).toLocaleString("es-MX", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>
              </div>
              <div className="pt-4 border-t space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tasa IVA:</span>
                  <span>
                    {(Number(transaction.vat_rate) * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">IVA Incluido:</span>
                  <span>{transaction.vat_included ? "Sí" : "No"}</span>
                </div>
                {transaction.type === "expense" && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      IVA Acreditable:
                    </span>
                    <span>{transaction.vat_creditable ? "Sí" : "No"}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-elegant md:col-span-2">
            <CardHeader>
              <CardTitle>Comprobantes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">
                  Tipo de comprobante
                </p>
                <p className="font-medium">
                  {transaction.receipt_type === "CFDI"
                    ? "CFDI"
                    : transaction.receipt_type === "INVOICE_PDF"
                    ? "Factura PDF"
                    : transaction.receipt_type === "TICKET"
                    ? "Ticket"
                    : "-"}
                </p>
              </div>
              {transaction.receipt_url && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Comprobante
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => window.open(transaction.receipt_url, "_blank")}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Ver Comprobante
                  </Button>
                </div>
              )}
              {transaction.uuid_cfdi && (
                <div>
                  <p className="text-sm text-muted-foreground">UUID CFDI</p>
                  <p className="font-mono text-sm">{transaction.uuid_cfdi}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {transaction.notes && (
            <Card className="shadow-elegant md:col-span-2">
              <CardHeader>
                <CardTitle>Notas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{transaction.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
}
