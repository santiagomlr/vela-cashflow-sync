import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Calendar, CheckCircle, Clock4, RefreshCcw, Trash2, Wallet } from "lucide-react";

const formatCurrency = (value: number) =>
  value.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  });

const getNextDueDate = (currentDate: string) => {
  const baseDate = new Date(currentDate);
  const next = new Date(baseDate);
  next.setMonth(baseDate.getMonth() + 1);
  return next.toISOString().split("T")[0];
};

const formatDate = (value: string) => {
  const date = new Date(value);
  return date.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
  });
};

type RecurringClient = Tables<"recurring_clients">;

type Props = {
  userId: string;
};

export const RecurringClientsSection = ({ userId }: Props) => {
  const { toast } = useToast();
  const [clients, setClients] = useState<RecurringClient[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    amount: "",
    dueDate: "",
    notes: "",
  });

  const dueSoon = useMemo(() => {
    const today = new Date();
    return clients.filter((client) => {
      const dueDate = new Date(client.due_date);
      const diff = (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
      return diff <= 7 && diff >= 0;
    });
  }, [clients]);

  const loadClients = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("recurring_clients")
      .select("*")
      .eq("user_id", userId)
      .order("due_date", { ascending: true });

    if (error) {
      toast({
        variant: "destructive",
        title: "Error al cargar clientes",
        description: error.message,
      });
    } else {
      setClients(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (userId) {
      loadClients();
    }
  }, [userId]);

  const resetForm = () => {
    setForm({ name: "", amount: "", dueDate: "", notes: "" });
  };

  const handleAdd = async () => {
    if (!form.name || !form.amount || !form.dueDate) {
      toast({
        variant: "destructive",
        title: "Faltan datos",
        description: "Nombre, monto y fecha de cobro son obligatorios",
      });
      return;
    }

    const amountNumber = Number.parseFloat(form.amount);
    if (Number.isNaN(amountNumber) || amountNumber <= 0) {
      toast({
        variant: "destructive",
        title: "Monto inválido",
        description: "Ingresa un monto mayor a cero",
      });
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("recurring_clients").insert({
      name: form.name,
      amount: amountNumber,
      due_date: form.dueDate,
      notes: form.notes || null,
      user_id: userId,
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "No se pudo guardar",
        description: error.message,
      });
    } else {
      toast({
        title: "Cliente agregado",
        description: "Se creó el recordatorio de cobro mensual",
      });
      resetForm();
      await loadClients();
    }

    setLoading(false);
  };

  const handleMarkPaid = async (client: RecurringClient) => {
    const nextDueDate = getNextDueDate(client.due_date);
    setLoading(true);
    const { error } = await supabase
      .from("recurring_clients")
      .update({ due_date: nextDueDate })
      .eq("id", client.id)
      .eq("user_id", userId);

    if (error) {
      toast({
        variant: "destructive",
        title: "No se pudo actualizar",
        description: error.message,
      });
    } else {
      toast({
        title: "Pago registrado",
        description: `Próximo cobro: ${formatDate(nextDueDate)}`,
      });
      await loadClients();
    }

    setLoading(false);
  };

  const handleDelete = async (clientId: string) => {
    setLoading(true);
    const { error } = await supabase
      .from("recurring_clients")
      .delete()
      .eq("id", clientId)
      .eq("user_id", userId);

    if (error) {
      toast({
        variant: "destructive",
        title: "No se pudo eliminar",
        description: error.message,
      });
    } else {
      toast({
        title: "Recordatorio eliminado",
        description: "El cliente se quitó de la lista mensual",
      });
      await loadClients();
    }

    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Cobros recurrentes</h2>
          <p className="text-muted-foreground">
            Clientes que pagan mes con mes y recordatorios de cobro
          </p>
        </div>
        {dueSoon.length > 0 && (
          <Badge variant="secondary" className="flex items-center gap-2">
            <Clock4 className="h-4 w-4" />
            {dueSoon.length} por cobrar en la semana
          </Badge>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-elegant">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Wallet className="h-6 w-6 text-primary" />
              <div>
                <CardTitle>Agregar cliente</CardTitle>
                <CardDescription>
                  Crea un recordatorio rápido para cobros mensuales
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre del cliente</Label>
              <Input
                placeholder="Ej. Corporativo Luna"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Monto mensual</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="$0.00"
                  value={form.amount}
                  onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Fecha de cobro</Label>
                <Input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm((prev) => ({ ...prev, dueDate: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notas (opcional)</Label>
              <Textarea
                placeholder="Referencia, método de pago o detalles adicionales"
                value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              />
            </div>
            <Button onClick={handleAdd} disabled={loading} className="w-full">
              <Calendar className="h-4 w-4 mr-2" />
              Guardar recordatorio
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-elegant h-full">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Próximos cobros</CardTitle>
              <CardDescription>
                Marca como pagado para mover el cobro al siguiente mes
              </CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={loadClients} disabled={loading}>
              <RefreshCcw className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {clients.length === 0 && (
              <p className="text-muted-foreground text-sm">
                Aún no tienes clientes recurrentes. Agrega el primero para recibir recordatorios.
              </p>
            )}
            {clients.map((client) => (
              <div
                key={client.id}
                className="rounded-lg border p-4 space-y-3 bg-muted/30"
              >
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{client.name}</p>
                      <Badge variant="outline">{formatCurrency(client.amount)}</Badge>
                    </div>
                    {client.notes && (
                      <p className="text-sm text-muted-foreground">{client.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" /> {formatDate(client.due_date)}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleMarkPaid(client)}
                      disabled={loading}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Pagado
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDelete(client.id)}
                      disabled={loading}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <Separator />
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock4 className="h-4 w-4" />
                  Próximo recordatorio mensual activo
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RecurringClientsSection;
