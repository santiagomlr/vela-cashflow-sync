import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { useRequireAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, FileText, FileSpreadsheet } from "lucide-react";
import { formatCurrencyDisplay, normalizeCurrencyValue } from "@/lib/currency";

type TransactionType = "income" | "expense";
type Method = "bank" | "cash";
type ReceiptType = "CFDI" | "INVOICE_PDF" | "TICKET";

export default function NewTransaction() {
  const { user, loading: authLoading } = useRequireAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

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
  const [isAmountFocused, setIsAmountFocused] = useState(false);

  // Computed values
  const [subtotal, setSubtotal] = useState(0);
  const [vatAmount, setVatAmount] = useState(0);
  const [total, setTotal] = useState(0);

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

  const isExpenseVatCategory =
    type === "expense" && category === "IVA, ISR y retenciones";

  useEffect(() => {
    calculateVAT();
  }, [amount, vatRate, vatIncluded]);

  const calculateVAT = () => {
    const amountNum = parseFloat(amount) || 0;
    const rateNum = parseFloat(vatRate) || 0;

    if (vatIncluded) {
      // VAT is included
      const sub = amountNum / (1 + rateNum);
      const vat = amountNum - sub;
      setSubtotal(parseFloat(sub.toFixed(2)));
      setVatAmount(parseFloat(vat.toFixed(2)));
      setTotal(amountNum);
    } else {
      // VAT not included
      const vat = amountNum * rateNum;
      const tot = amountNum + vat;
      setSubtotal(amountNum);
      setVatAmount(parseFloat(vat.toFixed(2)));
      setTotal(parseFloat(tot.toFixed(2)));
    }
  };

  const uploadFile = async (file: File, path: string): Promise<string> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${path}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("receipts")
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: signedData, error: signedError } =
      await supabase.storage
        .from("receipts")
        .createSignedUrl(filePath, 60 * 60 * 24 * 30);

    if (signedError || !signedData?.signedUrl) {
      throw signedError || new Error("No se pudo generar el enlace firmado");
    }

    return signedData.signedUrl;
  };

  const handleSubmit = async (status: "draft" | "posted") => {
    const isDraft = status === "draft";

    const numericAmount = parseFloat(amount);

    if (
      !concept ||
      !amount ||
      !category ||
      Number.isNaN(numericAmount) ||
      numericAmount <= 0
    ) {
      toast({
        variant: "destructive",
        title: "Campos requeridos",
        description: "Por favor completa todos los campos obligatorios.",
      });
      return;
    }

    const requiresReceipt =
      !isDraft && method === "bank" && type === "expense";

    if (requiresReceipt && (!receiptType || !receiptFile)) {
      toast({
        variant: "destructive",
        title: "Comprobante requerido",
        description:
          "Los egresos bancarios publicados requieren un comprobante adjunto.",
      });
      return;
    }

    setLoading(true);

    try {
      let receiptUrl = null;
      const uuidCfdi = null;

      // Upload receipt file
      if (receiptFile) {
        receiptUrl = await uploadFile(receiptFile, "receipts");
      }

      // Upload XML and extract UUID if CFDI
      if (receiptType === "CFDI" && xmlFile) {
        const xmlUrl = await uploadFile(xmlFile, "cfdi");
        // TODO: Extract UUID from XML content
        // For now, we'll just store the URL
      }

      const { error } = await supabase.from("transactions").insert({
        type,
        date: new Date().toISOString().split("T")[0],
        method,
        bank_account_id: null,
        amount: numericAmount,
        concept,
        category,
        vat_rate: parseFloat(vatRate),
        vat_included: vatIncluded,
        vat_creditable: true,
        subtotal,
        vat_amount: vatAmount,
        total,
        receipt_type: receiptType || null,
        receipt_url: receiptUrl,
        uuid_cfdi: uuidCfdi,
        signature_url: null,
        notes: notes || null,
        status,
        created_by: user?.id,
      });

      if (error) throw error;

      toast({
        title: status === "draft" ? "Borrador guardado" : "Transacción publicada",
        description: "El movimiento ha sido registrado correctamente.",
      });

      navigate("/transactions");
    } catch (error: any) {
      console.error("Error saving transaction:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
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
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Nuevo Movimiento</h1>
          <p className="text-muted-foreground">
            Registra un ingreso o egreso con cálculo automático de IVA
          </p>
        </div>

        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle>Información del Movimiento</CardTitle>
            <CardDescription>
              Completa los campos y el IVA se calculará automáticamente
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Tipo de Movimiento */}
            <div className="space-y-2">
              <Label>Tipo de Movimiento *</Label>
              <Tabs value={type} onValueChange={(v) => setType(v as TransactionType)}>
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
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={
                  isAmountFocused ? amount : formatCurrencyDisplay(amount)
                }
                onChange={(e) => setAmount(normalizeCurrencyValue(e.target.value))}
                onFocus={() => setIsAmountFocused(true)}
                onBlur={() => setIsAmountFocused(false)}
                required
              />
            </div>

            {/* Concepto */}
            <div className="space-y-2">
              <Label htmlFor="concept">Concepto *</Label>
              <Input
                id="concept"
                type="text"
                placeholder="Descripción del movimiento"
                maxLength={140}
                value={concept}
                onChange={(e) => setConcept(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                {concept.length}/140 caracteres
              </p>
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
                  <SelectItem value="0">Exento</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* IVA incluido */}
            {!isExpenseVatCategory && (
              <div className="flex items-center justify-between space-x-2">
                <div className="space-y-0.5">
                  <Label>¿IVA incluido en el monto?</Label>
                  <p className="text-sm text-muted-foreground">
                    Actívalo si el monto ya es el TOTAL cobrado/pagado (incluye IVA).
                  </p>
                </div>
                <Switch checked={vatIncluded} onCheckedChange={setVatIncluded} />
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
                  {(type === "income" ? incomeCategories : expenseCategories).map(
                    (cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Tipo de comprobante */}
            <div className="space-y-2">
              <Label>Tipo de comprobante</Label>
              <Tabs value={receiptType} onValueChange={(v) => setReceiptType(v as ReceiptType)}>
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
                  Comprobante (PDF/XML/imagen) {method === "bank" && "*"}
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="receipt"
                    type="file"
                    accept=".pdf,.xml,.jpg,.jpeg,.png"
                    onChange={(e) =>
                      setReceiptFile(e.target.files?.[0] || null)
                    }
                  />
                  {receiptFile && (
                    <FileText className="h-5 w-5 text-primary" />
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
                  {xmlFile && (
                    <FileSpreadsheet className="h-5 w-5 text-primary" />
                  )}
                </div>
              </div>
            )}

            {/* Notas */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notas</Label>
              <Textarea
                id="notes"
                placeholder="Notas adicionales (opcional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            {/* Desglose calculado */}
            <Card className="bg-muted/50">
              <CardHeader>
                <CardTitle className="text-lg">Desglose</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="font-mono font-semibold">
                    ${subtotal.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">IVA:</span>
                  <span className="font-mono font-semibold">
                    ${vatAmount.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span className="font-semibold">Total:</span>
                  <span className="font-mono font-bold text-lg">
                    ${total.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Botones */}
            <div className="flex gap-4 pt-4">
              <Button
                variant="secondary"
                onClick={() => handleSubmit("draft")}
                disabled={loading}
                className="flex-1"
              >
                Guardar Borrador
              </Button>
              <Button
                onClick={() => handleSubmit("posted")}
                disabled={loading}
                className="flex-1"
              >
                Publicar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
