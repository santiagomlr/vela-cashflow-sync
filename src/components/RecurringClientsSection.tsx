import { type DragEvent, useCallback, useEffect, useMemo, useState } from "react";
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
import { Calendar, CheckCircle, Clock4, RefreshCcw, Trash2, UploadCloud, Wallet } from "lucide-react";

const formatCurrency = (value: number) =>
  value.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  });

const getMonthDate = (year: number, month: number, day: number) => {
  const lastDay = new Date(year, month + 1, 0).getDate();
  const safeDay = Math.min(day, lastDay);
  return new Date(year, month, safeDay);
};

const getInitialDueDate = (billingDay: number) => {
  const today = new Date();
  const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const thisMonth = getMonthDate(today.getFullYear(), today.getMonth(), billingDay);

  if (thisMonth.getTime() < todayDateOnly.getTime()) {
    const nextMonth = getMonthDate(today.getFullYear(), today.getMonth() + 1, billingDay);
    return nextMonth.toISOString().split("T")[0];
  }

  return thisMonth.toISOString().split("T")[0];
};

const getNextDueDate = (currentDate: string, billingDay: number) => {
  const baseDate = new Date(currentDate);
  const next = getMonthDate(baseDate.getFullYear(), baseDate.getMonth() + 1, billingDay);
  return next.toISOString().split("T")[0];
};

const formatDate = (value: string) => {
  const date = new Date(value);
  return date.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
  });
};

const formatBillingDay = (day: number) => `Día ${day} de cada mes`;

type RecurringClient = Tables<"recurring_clients">;
type RecurringClientWithPending = RecurringClient & {
  pendingCharge?: Tables<"transactions"> | null;
};

type Props = {
  userId: string;
};

export const RecurringClientsSection = ({ userId }: Props) => {
  const { toast } = useToast();
  const [clients, setClients] = useState<RecurringClientWithPending[]>([]);
  const [loading, setLoading] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    amount: "",
    billingDay: "",
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

  const loadClients = useCallback(async () => {
    setLoading(true);
    const { data: clientsData, error: clientsError } = await supabase
      .from("recurring_clients")
      .select("*")
      .eq("user_id", userId)
      .order("billing_day", { ascending: true });

    if (clientsError) {
      toast({
        variant: "destructive",
        title: "Error al cargar clientes",
        description: clientsError.message,
      });
      setLoading(false);
      return;
    }

    const { data: pendingCharges, error: pendingError } = await supabase
      .from("transactions")
      .select("*")
      .eq("created_by", userId)
      .eq("status", "pending")
      .eq("type", "income")
      .not("recurring_client_id", "is", null);

    if (pendingError) {
      toast({
        variant: "destructive",
        title: "Error al cargar cobros pendientes",
        description: pendingError.message,
      });
      setLoading(false);
      return;
    }

    const pendingByClient = new Map<string, Tables<"transactions">>();
    (pendingCharges || []).forEach((charge) => {
      if (charge.recurring_client_id) {
        pendingByClient.set(charge.recurring_client_id, charge as Tables<"transactions">);
      }
    });

    setClients(
      (clientsData || []).map((client) => ({
        ...client,
        pendingCharge: pendingByClient.get(client.id) ?? null,
      })),
    );
    setLoading(false);
  }, [toast, userId]);

  useEffect(() => {
    if (userId) {
      loadClients();
    }
  }, [loadClients, userId]);

  const resetForm = () => {
    setForm({ name: "", amount: "", billingDay: "", notes: "" });
  };

  const createPendingCharge = async (client: RecurringClient, date: string) => {
    const { error } = await supabase.from("transactions").insert({
      type: "income",
      concept: `Membresía ${client.name}`,
      category: "Mensualidades del sistema",
      method: "bank",
      bank_account_id: null,
      amount: client.amount,
      subtotal: client.amount,
      vat_rate: 0,
      vat_amount: 0,
      vat_included: true,
      total: client.amount,
      date,
      status: "pending",
      created_by: userId,
      notes: client.notes,
      recurring_client_id: client.id,
    });

    if (error) {
      throw error;
    }
  };

  const handleAdd = async () => {
    if (!form.name || !form.amount || !form.billingDay) {
      toast({
        variant: "destructive",
        title: "Faltan datos",
        description: "Nombre, monto y día de cobro son obligatorios",
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

    const billingDayNumber = Number.parseInt(form.billingDay, 10);
    if (Number.isNaN(billingDayNumber) || billingDayNumber < 1 || billingDayNumber > 31) {
      toast({
        variant: "destructive",
        title: "Día inválido",
        description: "El día de cobro debe estar entre 1 y 31",
      });
      return;
    }

    const initialDueDate = getInitialDueDate(billingDayNumber);

    setLoading(true);
    const { data: newClient, error } = await supabase
      .from("recurring_clients")
      .insert({
        name: form.name,
        amount: amountNumber,
        due_date: initialDueDate,
        billing_day: billingDayNumber,
        notes: form.notes || null,
        user_id: userId,
      })
      .select()
      .single();

    if (error) {
      toast({
        variant: "destructive",
        title: "No se pudo guardar",
        description: error.message,
      });
    } else if (newClient) {
      try {
        await createPendingCharge(newClient, initialDueDate);
        toast({
          title: "Recordatorio creado",
          description: "Se creó el recordatorio de cobro mensual",
        });
        resetForm();
        await loadClients();
      } catch (pendingError: unknown) {
        toast({
          variant: "destructive",
          title: "Error al crear cobro pendiente",
          description:
            pendingError instanceof Error
              ? pendingError.message
              : "No se pudo generar el cobro pendiente",
        });
      }
    }

    setLoading(false);
  };

  const completePaymentCycle = async (
    client: RecurringClientWithPending,
    receiptUrl?: string | null,
  ) => {
    const today = new Date().toISOString().split("T")[0];

    if (client.pendingCharge) {
      const { error: updateError } = await supabase
        .from("transactions")
        .update({
          status: "posted",
          date: today,
          receipt_url: receiptUrl ?? client.pendingCharge.receipt_url ?? null,
          receipt_type: receiptUrl ? "INVOICE_PDF" : client.pendingCharge.receipt_type,
        })
        .eq("id", client.pendingCharge.id);

      if (updateError) {
        throw updateError;
      }
    } else {
      const { error: insertError } = await supabase.from("transactions").insert({
        type: "income",
        concept: `Membresía ${client.name}`,
        category: "Mensualidades del sistema",
        method: "bank",
        bank_account_id: null,
        amount: client.amount,
        subtotal: client.amount,
        vat_rate: 0,
        vat_amount: 0,
        vat_included: true,
        total: client.amount,
        date: today,
        status: "posted",
        created_by: userId,
        notes: client.notes,
        recurring_client_id: client.id,
        receipt_url: receiptUrl ?? null,
        receipt_type: receiptUrl ? "INVOICE_PDF" : null,
      });

      if (insertError) {
        throw insertError;
      }
    }

    const nextDueDate = getNextDueDate(client.due_date, client.billing_day);
    const { error: clientUpdateError } = await supabase
      .from("recurring_clients")
      .update({ due_date: nextDueDate })
      .eq("id", client.id)
      .eq("user_id", userId);

    if (clientUpdateError) {
      throw clientUpdateError;
    }

    await createPendingCharge({ ...client, due_date: nextDueDate }, nextDueDate);
  };

  const handleMarkPaid = async (client: RecurringClientWithPending) => {
    try {
      setLoading(true);
      await completePaymentCycle(client, client.pendingCharge?.receipt_url ?? null);
      toast({
        title: "Pago registrado",
        description: `Próximo cobro: ${formatDate(
          getNextDueDate(client.due_date, client.billing_day),
        )}`,
      });
      await loadClients();
    } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: "No se pudo actualizar",
        description: error instanceof Error ? error.message : "Error desconocido",
      });
    } finally {
      setLoading(false);
    }
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

  const uploadInvoice = async (file: File) => {
    const fileExt = file.name.split(".").pop();
    const fileName = `membresia_${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`;
    const filePath = `receipts/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("receipts")
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: signedData, error: signedError } = await supabase.storage
      .from("receipts")
      .createSignedUrl(filePath, 60 * 60 * 24 * 30);

    if (signedError || !signedData?.signedUrl) {
      throw signedError || new Error("No se pudo generar el enlace firmado");
    }

    return signedData.signedUrl;
  };

  const handleDropInvoice = async (
    event: DragEvent<HTMLDivElement>,
    client: RecurringClientWithPending,
  ) => {
    event.preventDefault();
    setDraggingId(null);

    const file = event.dataTransfer.files?.[0];
    if (!file) {
      toast({
        variant: "destructive",
        title: "Archivo faltante",
        description: "Arrastra un archivo PDF o XML de la factura",
      });
      return;
    }

    try {
      setLoading(true);
      const receiptUrl = await uploadInvoice(file);
      await completePaymentCycle(client, receiptUrl);
      toast({
        title: "Cobro registrado",
        description: `Se subió la factura y se generó el próximo cobro para ${formatDate(
          getNextDueDate(client.due_date, client.billing_day),
        )}`,
      });
      await loadClients();
    } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: "No se pudo registrar la factura",
        description: error instanceof Error ? error.message : "Error desconocido",
      });
    } finally {
      setLoading(false);
    }
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
                  Crea un recordatorio rápido para cobros mensuales tipo membresía
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
                <Label>Día de cobro (del mes)</Label>
                <Input
                  type="number"
                  min="1"
                  max="31"
                  placeholder="Ej. 14"
                  value={form.billingDay}
                  onChange={(e) => setForm((prev) => ({ ...prev, billingDay: e.target.value }))}
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
                Drag & drop tu factura para marcar cobros de membresías y programar el siguiente ciclo
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
                className={`rounded-lg border p-4 space-y-3 bg-muted/30 transition-smooth ${draggingId === client.id ? "border-primary bg-primary/5" : ""}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDraggingId(client.id);
                }}
                onDragLeave={() => setDraggingId(null)}
                onDrop={(event) => handleDropInvoice(event, client)}
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
                      <Calendar className="h-4 w-4" /> {formatBillingDay(client.billing_day)}
                    </Badge>
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Clock4 className="h-4 w-4" /> {formatDate(client.due_date)}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleMarkPaid(client)}
                      disabled={loading}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Cobrado
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
                  <UploadCloud className="h-4 w-4" />
                  Arrastra la factura aquí para registrar el cobro pendiente.
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock4 className="h-3 w-3" />
                  {client.pendingCharge
                    ? `Cobro pendiente creado para ${formatDate(client.pendingCharge.date)}`
                    : "Aún no se ha generado un cobro pendiente"}
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
