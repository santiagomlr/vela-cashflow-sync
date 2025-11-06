import { useState } from "react";
import Layout from "@/components/Layout";
import { useRequireAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileSpreadsheet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type TransactionRow = Database["public"]["Tables"]["transactions"]["Row"] & {
  bank_accounts?: {
    name: string | null;
    institution: string | null;
  } | null;
};

type HyperlinkMeta = {
  rowIndex: number;
  columnIndex: number;
  url: string;
  label: string;
};

type PreparedSheet = {
  rows: (string | number | null)[][];
  hyperlinks: HyperlinkMeta[];
  currencyColumns: number[];
  columnWidths: number[];
};

const TYPE_LABELS: Record<string, string> = {
  income: "Ingreso",
  expense: "Egreso",
  transfer: "Transferencia",
};

const METHOD_LABELS: Record<string, string> = {
  bank: "Banco",
  cash: "Efectivo",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Borrador",
  posted: "Publicado",
  pending: "Pendiente",
};

const RECEIPT_LABELS: Record<string, string> = {
  CFDI: "CFDI",
  INVOICE_PDF: "Factura PDF",
  TICKET: "Ticket",
};

const formatDate = (value: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("es-MX").format(date);
};

const formatType = (value: string | null) => (value ? TYPE_LABELS[value] ?? value : "");

const formatMethod = (value: string | null) => (value ? METHOD_LABELS[value] ?? value : "");

const formatStatus = (value: string | null) => (value ? STATUS_LABELS[value] ?? value : "");

const formatReceiptType = (value: string | null) => (value ? RECEIPT_LABELS[value] ?? value : "");

const getBankAccountLabel = (transaction: TransactionRow) => {
  const account = transaction.bank_accounts;
  if (!account) return "";
  const parts = [account.institution, account.name].filter(Boolean);
  return parts.join(" - ");
};

const roundCurrency = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

const getVatBreakdown = (transaction: TransactionRow) => {
  const vatRate = Number(transaction.vat_rate ?? 0);
  const vatIncluded = transaction.vat_included ?? true;
  if (transaction.subtotal !== null && transaction.vat_amount !== null && transaction.total !== null) {
    return {
      subtotal: Number(transaction.subtotal),
      vat: Number(transaction.vat_amount),
      total: Number(transaction.total),
    };
  }

  const baseAmount = Number(transaction.amount ?? 0);
  if (!vatRate) {
    return {
      subtotal: roundCurrency(baseAmount),
      vat: 0,
      total: roundCurrency(baseAmount),
    };
  }

  if (vatIncluded) {
    const subtotal = roundCurrency(baseAmount / (1 + vatRate));
    const vat = roundCurrency(baseAmount - subtotal);
    return {
      subtotal,
      vat,
      total: roundCurrency(baseAmount),
    };
  }

  const vat = roundCurrency(baseAmount * vatRate);
  return {
    subtotal: roundCurrency(baseAmount),
    vat,
    total: roundCurrency(baseAmount + vat),
  };
};

const prepareBanregioSheet = (transactions: TransactionRow[]): PreparedSheet => {
  const rows: PreparedSheet["rows"] = [[
    "Fecha",
    "Tipo",
    "Cuenta Bancaria",
    "Concepto",
    "Categoría",
    "Subtotal",
    "IVA",
    "Total",
    "UUID CFDI",
    "Tipo Comprobante",
    "Comprobante",
    "Notas",
  ]];
  const hyperlinks: HyperlinkMeta[] = [];

  transactions
    .filter((transaction) => transaction.method === "bank")
    .forEach((transaction) => {
      const vat = getVatBreakdown(transaction);
      rows.push([
        formatDate(transaction.date),
        formatType(transaction.type),
        getBankAccountLabel(transaction),
        transaction.concept,
        transaction.category ?? "",
        vat.subtotal,
        vat.vat,
        vat.total,
        transaction.uuid_cfdi ?? "",
        formatReceiptType(transaction.receipt_type),
        transaction.receipt_url ? "Abrir comprobante" : "",
        transaction.notes ?? "",
      ]);

      const currentRowIndex = rows.length - 1;
      if (transaction.receipt_url) {
        hyperlinks.push({
          rowIndex: currentRowIndex,
          columnIndex: 10,
          url: transaction.receipt_url,
          label: "Abrir comprobante",
        });
      }
    });

  return {
    rows,
    hyperlinks,
    currencyColumns: [5, 6, 7],
    columnWidths: [12, 14, 28, 32, 20, 14, 14, 14, 24, 20, 22, 32],
  };
};

const prepareVelaSheet = (transactions: TransactionRow[]): PreparedSheet => {
  const rows: PreparedSheet["rows"] = [[
    "Fecha",
    "Tipo",
    "Método",
    "Cuenta Bancaria",
    "Concepto",
    "Categoría",
    "Subtotal",
    "IVA",
    "Total",
    "Estatus",
    "Comprobante",
    "Firma",
    "UUID CFDI",
    "Tipo Comprobante",
    "Notas",
  ]];
  const hyperlinks: HyperlinkMeta[] = [];

  transactions.forEach((transaction) => {
    const vat = getVatBreakdown(transaction);
    rows.push([
      formatDate(transaction.date),
      formatType(transaction.type),
      formatMethod(transaction.method),
      getBankAccountLabel(transaction),
      transaction.concept,
      transaction.category ?? "",
      vat.subtotal,
      vat.vat,
      vat.total,
      formatStatus(transaction.status),
      transaction.receipt_url ? "Abrir comprobante" : "",
      transaction.signature_url ? "Ver firma" : "",
      transaction.uuid_cfdi ?? "",
      formatReceiptType(transaction.receipt_type),
      transaction.notes ?? "",
    ]);

    const currentRowIndex = rows.length - 1;
    if (transaction.receipt_url) {
      hyperlinks.push({
        rowIndex: currentRowIndex,
        columnIndex: 10,
        url: transaction.receipt_url,
        label: "Abrir comprobante",
      });
    }
    if (transaction.signature_url) {
      hyperlinks.push({
        rowIndex: currentRowIndex,
        columnIndex: 11,
        url: transaction.signature_url,
        label: "Ver firma",
      });
    }
  });

  return {
    rows,
    hyperlinks,
    currencyColumns: [6, 7, 8],
    columnWidths: [12, 14, 12, 28, 32, 20, 14, 14, 14, 14, 22, 22, 24, 20, 32],
  };
};

export default function Export() {
  const { user, loading } = useRequireAuth();
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!user || isExporting) return;

    setIsExporting(true);

    try {
      const { data, error } = await supabase
        .from("transactions")
        .select("*, bank_accounts(name, institution)")
        .is("deleted_at", null)
        .order("date", { ascending: true });

      if (error) throw error;

      const transactions = (data as TransactionRow[]) ?? [];

      if (transactions.length === 0) {
        toast({
          title: "Sin datos",
          description: "No hay transacciones disponibles para exportar.",
        });
        return;
      }

      const XLSX = await import(
        /* @vite-ignore */ "https://cdn.sheetjs.com/xlsx-latest/package/xlsx.mjs"
      );

      const banregioSheet = prepareBanregioSheet(transactions);
      const velaSheet = prepareVelaSheet(transactions);

      const workbook = XLSX.utils.book_new();

      const appendSheet = (prepared: PreparedSheet, name: string) => {
        const worksheet = XLSX.utils.aoa_to_sheet(prepared.rows);

        worksheet["!cols"] = prepared.columnWidths.map((width) => ({ wch: width }));

        if (prepared.rows.length > 1) {
          prepared.currencyColumns.forEach((columnIndex) => {
            for (let rowIndex = 1; rowIndex < prepared.rows.length; rowIndex += 1) {
              const address = XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex });
              const cell = worksheet[address];
              if (cell && typeof cell.v === "number") {
                cell.z = "$#,##0.00";
              }
            }
          });
        }

        prepared.hyperlinks.forEach(({ rowIndex, columnIndex, url, label }) => {
          const address = XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex });
          const cell = worksheet[address] ?? { t: "s", v: label };
          cell.t = "s";
          cell.v = label;
          cell.l = { Target: url, Tooltip: label };
          worksheet[address] = cell;
        });

        const lastColumnIndex = prepared.rows[0]?.length ? prepared.rows[0].length - 1 : 0;
        const lastColumnAddress = XLSX.utils.encode_cell({ r: 0, c: lastColumnIndex });
        worksheet["!autofilter"] = { ref: `A1:${lastColumnAddress}` };

        XLSX.utils.book_append_sheet(workbook, worksheet, name);
      };

      appendSheet(banregioSheet, "Banregio_Contador");
      appendSheet(velaSheet, "Vela_Todos");

      const today = new Date();
      const formattedDate = today.toISOString().split("T")[0];
      XLSX.writeFile(workbook, `vela_export_${formattedDate}.xlsx`, {
        cellDates: true,
        compression: true,
      });

      toast({
        title: "Exportación completada",
        description: "Se generó el archivo Excel con tus movimientos.",
      });
    } catch (error) {
      console.error("Error exporting transactions", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo generar el archivo de exportación.",
      });
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) {
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
        <div>
          <h1 className="text-3xl font-bold mb-2">Exportar Datos</h1>
          <p className="text-muted-foreground">
            Archivo Excel con doble hoja
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="shadow-elegant">
            <CardHeader>
              <div className="flex items-center space-x-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <FileSpreadsheet className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <CardTitle>Hoja: Banregio_Contador</CardTitle>
                  <CardDescription>Solo movimientos bancarios</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>• Filtrado por método = banco</p>
              <p>• Incluye hipervínculos a comprobantes</p>
              <p>• Incluye desglose de IVA</p>
              <p>• Formato para contador</p>
            </CardContent>
          </Card>

          <Card className="shadow-elegant">
            <CardHeader>
              <div className="flex items-center space-x-4">
                <div className="p-3 rounded-lg bg-secondary/10">
                  <FileSpreadsheet className="h-8 w-8 text-secondary" />
                </div>
                <div>
                  <CardTitle>Hoja: Vela_Todos</CardTitle>
                  <CardDescription>Todos los movimientos</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>• Incluye efectivo y banco</p>
              <p>• Hipervínculos a comprobantes</p>
              <p>• Hipervínculos a firmas</p>
              <p>• Vista completa para administración</p>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-elegant">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4 text-center">
              <FileSpreadsheet className="h-16 w-16 text-muted-foreground" />
              <div>
                <h3 className="text-lg font-semibold mb-2">
                  Exportar a Excel
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Se creará un archivo Excel con dos pestañas: Banregio_Contador y Vela_Todos
                </p>
              </div>
              <Button onClick={handleExport} size="lg" disabled={isExporting}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                {isExporting ? "Generando archivo..." : "Exportar Datos"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
