import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { useRequireAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Save, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type TransactionType = "income" | "expense";
type Method = "bank" | "cash";
type ReceiptType = "CFDI" | "INVOICE_PDF" | "TICKET";

export default function TransactionEdit() {
  const { id } = useParams();
  const { user, loading: authLoading } = useRequireAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [type, setType] = useState<TransactionType>("income");
  const [amount, setAmount] = useState("");
  const [concept, setConcept] = useState("");
  const [method, setMethod] = useState<Method>("bank");
  const [vatRate, setVatRate] = useState("0.16");
  const [vatIncluded, setVatIncluded] = useState(true);
  const [category, setCategory] = useState("");
  const [receiptType, setReceiptType] = useState<ReceiptType | "">("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [xmlFile, setXmlFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [currentReceiptUrl, setCurrentReceiptUrl] = useState("");

  // Computed values
  const subtotal =
    vatIncluded && amount
      ? (parseFloat(amount) / (1 + parseFloat(vatRate))).toFixed(2)
      : amount;
  const vatAmount =
    amount && subtotal
      ? (parseFloat(amount) - parseFloat(subtotal)).toFixed(2)
      : "0.00";
  const total = vatIncluded
    ? amount
    : amount
    ? (parseFloat(amount) * (1 + parseFloat(vatRate))).toFixed(2)
    : "0.00";

  const isExpenseVatCategory =
    type === "expense" && category === "IVA, ISR y retenciones";

  const incomeCategories = [
    "Instalaciones completas",
    "Mensualidades del sistema",
    "Talleres o capacitaciones",
    "Creación de páginas",
    "Hosting y mantenimiento",
    "Servicios de branding o redes sociales",
    "Colaboraciones externas",
    "Comisiones por referidos o integraciones",
    "Reembolsos o recuperaciones",
    "Bonos o incentivos recibidos",
  ];

  const expenseCategories = [
    "Hosting, dominios, licencias de software",
    "Sueldos o comisiones del equipo",
    "Honorarios de programadores o diseñadores externos",
    "Campañas pagadas",
    "Material gráfico o contenido audiovisual",
    "Contabilidad, facturación y herramientas financieras",
    "Internet, telefonía y servicios básicos",
    "Viajes, comidas de trabajo, eventos",
    "Papelería, mantenimiento o compras menores",
    "IVA, ISR y retenciones",
    "Cuotas y trámites legales",
  ];

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

      // Populate form with transaction data
      setType(data.type as TransactionType);
      setAmount(data.amount.toString());
      setConcept(data.concept);
      setMethod(data.method as Method);
      setVatRate(data.vat_rate.toString());
      setVatIncluded(data.vat_included);
      setCategory(data.category || "");
      setReceiptType((data.receipt_type || "") as ReceiptType | "");
      setNotes(data.notes || "");
      setCurrentReceiptUrl(data.receipt_url || "");
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

  const uploadFile = async (file: File, bucket: string): Promise<string> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSubmit = async (status: "draft" | "posted") => {
    if (!amount || !concept || !category) {
      toast({
        variant: "destructive",
        title: "Campos requeridos",
        description: "Completa todos los campos obligatorios.",
      });
      return;
    }

    setSaving(true);
    try {
      let receiptUrl = currentReceiptUrl;
      let uuidCfdi = null;

      // Upload new receipt file if provided
      if (receiptFile) {
        receiptUrl = await uploadFile(receiptFile, "receipts");
      }

      // Upload XML if provided
      if (xmlFile && receiptType === "CFDI") {
        await uploadFile(xmlFile, "receipts");
        // For now, we'll just store the URL
      }

      const { error } = await supabase
        .from("transactions")
        .update({
          type,
          method,
          amount: parseFloat(amount),
          concept,
          category,
          vat_rate: parseFloat(vatRate),
          vat_included: vatIncluded,
          receipt_type: receiptType || null,
          receipt_url: receiptUrl,
          uuid_cfdi: uuidCfdi,
          notes: notes || null,
          status,
        })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Guardado",
        description: "La transacción ha sido actualizada.",
      });
      navigate(`/transactions/${id}`);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setSaving(false);
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
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={() => navigate(`/transactions/${id}`)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Editar Transacción</h1>
              <p className="text-muted-foreground">Modifica los detalles</p>
            </div>
          </div>
        </div>

        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle>Información del Movimiento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Tipo de Movimiento */}
            <div className="space-y-2">
              <Label>Tipo de Movimiento *</Label>
              <Tabs
                value={type}
                onValueChange={(v) => setType(v as TransactionType)}
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="income">Ingreso</TabsTrigger>
                  <TabsTrigger value="expense">Egreso</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Monto */}
            <div className="space-y-2">
              <Label htmlFor="amount">Monto (MXN) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>

            {/* Concepto */}
            <div className="space-y-2">
              <Label htmlFor="concept">Concepto *</Label>
              <Input
                id="concept"
                value={concept}
                onChange={(e) => setConcept(e.target.value)}
                placeholder="Descripción del movimiento"
                maxLength={140}
              />
            </div>

            {/* Método */}
            <div className="space-y-2">
              <Label>Método *</Label>
              <Tabs value={method} onValueChange={(v) => setMethod(v as Method)}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="bank">Banco</TabsTrigger>
                  <TabsTrigger value="cash">Cash</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* IVA % */}
            <div className="space-y-2">
              <Label htmlFor="vat_rate">IVA % *</Label>
              <Select value={vatRate} onValueChange={setVatRate}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0.16">16%</SelectItem>
                  <SelectItem value="0">0%</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* IVA Incluido */}
            {!isExpenseVatCategory && (
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>¿IVA incluido en el monto?</Label>
                  <p className="text-sm text-muted-foreground">
                    Actívalo si el monto ya es el TOTAL cobrado/pagado (incluye
                    IVA).
                  </p>
                </div>
                <Switch
                  checked={vatIncluded}
                  onCheckedChange={setVatIncluded}
                />
              </div>
            )}

            {/* Categoría */}
            <div className="space-y-2">
              <Label htmlFor="category">Categoría *</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una categoría" />
                </SelectTrigger>
                <SelectContent>
                  {(type === "income"
                    ? incomeCategories
                    : expenseCategories
                  ).map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tipo de comprobante */}
            <div className="space-y-2">
              <Label>Tipo de comprobante</Label>
              <Tabs
                value={receiptType}
                onValueChange={(v) => setReceiptType(v as ReceiptType)}
              >
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="CFDI">CFDI</TabsTrigger>
                  <TabsTrigger value="INVOICE_PDF">Factura PDF</TabsTrigger>
                  <TabsTrigger value="TICKET">Ticket</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Comprobante */}
            {receiptType && (
              <div className="space-y-2">
                <Label htmlFor="receipt">
                  Comprobante (PDF/XML/imagen)
                  {currentReceiptUrl && " - Archivo actual cargado"}
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="receipt"
                    type="file"
                    accept=".pdf,.xml,.jpg,.jpeg,.png"
                    onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                  />
                  {(receiptFile || currentReceiptUrl) && (
                    <Upload className="h-5 w-5 text-primary" />
                  )}
                </div>
              </div>
            )}

            {/* CFDI XML */}
            {receiptType === "CFDI" && (
              <div className="space-y-2">
                <Label htmlFor="cfdi_xml">CFDI XML</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="cfdi_xml"
                    type="file"
                    accept=".xml"
                    onChange={(e) => setXmlFile(e.target.files?.[0] || null)}
                  />
                  {xmlFile && <Upload className="h-5 w-5 text-primary" />}
                </div>
              </div>
            )}

            {/* Notas */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notas</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notas adicionales..."
                rows={3}
              />
            </div>

            {/* Resumen de cálculo */}
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal:</span>
                <span className="font-mono">${subtotal}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">IVA:</span>
                <span className="font-mono">${vatAmount}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Total:</span>
                <span className="font-mono">${total}</span>
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                variant="outline"
                onClick={() => handleSubmit("draft")}
                disabled={saving}
              >
                Guardar Borrador
              </Button>
              <Button onClick={() => handleSubmit("posted")} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                Guardar y Publicar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
