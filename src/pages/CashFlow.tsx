import { useCallback, useEffect, useMemo, useState } from "react";
import { DateRange } from "react-day-picker";
import {
  format,
  subMonths,
  parseISO,
  startOfDay,
  startOfWeek,
  startOfMonth,
} from "date-fns";
import { es } from "date-fns/locale";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";
import { CalendarIcon, Download } from "lucide-react";

import Layout from "@/components/Layout";
import { useRequireAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface Transaction {
  id: string;
  date: string;
  type: string;
  total: number | null;
  category: string | null;
  status: string | null;
}

type Granularity = "day" | "week" | "month";

type CashFlowSeriesItem = {
  period: string;
  periodDate: Date;
  income: number;
  expense: number;
  net: number;
};

const currencyFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const incomeGroups = {
  crm: [
    "Instalaciones completas",
    "Mensualidades del sistema",
    "Talleres o capacitaciones",
  ],
  webBranding: [
    "Creación de páginas",
    "Hosting y mantenimiento",
    "Servicios de branding o redes sociales",
  ],
  projects: [
    "Colaboraciones externas",
    "Comisiones por referidos o integraciones",
  ],
  others: ["Reembolsos o recuperaciones", "Bonos o incentivos recibidos"],
};

const expenseGroups = {
  costOfSales: [
    "Honorarios de programadores o diseñadores externos",
    "Hosting, dominios, licencias de software",
  ],
  admin: [
    "Sueldos o comisiones del equipo",
    "Contabilidad, facturación y herramientas financieras",
    "Internet, telefonía y servicios básicos",
  ],
  marketing: ["Campañas pagadas", "Material gráfico o contenido audiovisual"],
  general: [
    "Viajes, comidas de trabajo, eventos",
    "Papelería, mantenimiento o compras menores",
  ],
  depreciation: ["Depreciaciones y amortizaciones"],
};

const capexCategories = [
  "Compra o renovación de equipo",
  "Inversión en nuevos productos o subcuentas",
  "Inversión en marketing de largo plazo",
];

const financingCategories = [
  "Aportes de socios",
  "Créditos recibidos",
  "Pago de créditos",
  "Dividendos o retiros de socios",
];

const getDefaultDateRange = (): DateRange => ({
  from: subMonths(new Date(), 3),
  to: new Date(),
});

const formatDateRangeLabel = (range?: DateRange) => {
  if (!range?.from) {
    return "Selecciona rango";
  }

  const fromLabel = format(range.from, "dd MMM yyyy", { locale: es });
  const toLabel = range.to ? format(range.to, "dd MMM yyyy", { locale: es }) : "";

  return range.to ? `${fromLabel} - ${toLabel}` : fromLabel;
};

const getPeriodStart = (date: Date, granularity: Granularity) => {
  switch (granularity) {
    case "day":
      return startOfDay(date);
    case "week":
      return startOfWeek(date, { weekStartsOn: 1 });
    case "month":
    default:
      return startOfMonth(date);
  }
};

const getPeriodLabel = (date: Date, granularity: Granularity) => {
  switch (granularity) {
    case "day":
      return format(date, "dd MMM", { locale: es });
    case "week":
      return `Semana ${format(date, "II", { locale: es })}`;
    case "month":
    default:
      return format(date, "MMM yyyy", { locale: es });
  }
};

const sumByCategories = (transactions: Transaction[], categories?: string[]) => {
  const shouldIncludeAll = !categories || categories.length === 0;
  return transactions.reduce((sum, transaction) => {
    const amount = Number(transaction.total ?? 0);
    if (amount === 0) return sum;

    if (shouldIncludeAll) {
      return sum + amount;
    }

    const category = transaction.category ?? "";
    if (categories.includes(category)) {
      return sum + amount;
    }

    return sum;
  }, 0);
};

const sumFinancing = (transactions: Transaction[]) => {
  return transactions.reduce((sum, transaction) => {
    const category = transaction.category ?? "";
    if (!financingCategories.includes(category)) {
      return sum;
    }

    const amount = Number(transaction.total ?? 0);
    if (transaction.type === "income") {
      return sum + amount;
    }

    if (transaction.type === "expense") {
      return sum - amount;
    }

    return sum;
  }, 0);
};

const sumCapex = (transactions: Transaction[]) => {
  return transactions.reduce((sum, transaction) => {
    if (transaction.type !== "expense") return sum;
    const category = transaction.category ?? "";
    if (!capexCategories.includes(category)) return sum;
    return sum + Number(transaction.total ?? 0);
  }, 0);
};

export default function CashFlow() {
  const { user, loading: authLoading } = useRequireAuth();
  const [dateRange, setDateRange] = useState<DateRange | undefined>(getDefaultDateRange);
  const [granularity, setGranularity] = useState<Granularity>("week");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!user || !dateRange?.from || !dateRange?.to) {
      return;
    }

    const fetchTransactions = async () => {
      setLoadingData(true);
      try {
        const { data, error } = await supabase
          .from("transactions")
          .select("id, date, type, total, category, status")
          .is("deleted_at", null)
          .gte("date", format(dateRange.from, "yyyy-MM-dd"))
          .lte("date", format(dateRange.to, "yyyy-MM-dd"))
          .in("status", ["posted", "pending"]);

        if (error) {
          throw error;
        }

        const filtered = (data ?? []).filter((transaction) =>
          ["income", "expense"].includes(transaction.type ?? ""),
        );

        setTransactions(filtered as Transaction[]);
      } catch (error) {
        console.error("Error fetching transactions", error);
        setTransactions([]);
      } finally {
        setLoadingData(false);
      }
    };

    fetchTransactions();
  }, [user, dateRange?.from, dateRange?.to]);

  const cashflowSeries = useMemo<CashFlowSeriesItem[]>(() => {
    const grouped = new Map<string, CashFlowSeriesItem>();

    transactions.forEach((transaction) => {
      const amount = Number(transaction.total ?? 0);
      if (amount === 0) return;

      const date = parseISO(transaction.date);
      const periodDate = getPeriodStart(date, granularity);
      const key = periodDate.toISOString();

      if (!grouped.has(key)) {
        grouped.set(key, {
          period: getPeriodLabel(periodDate, granularity),
          periodDate,
          income: 0,
          expense: 0,
          net: 0,
        });
      }

      const current = grouped.get(key)!;

      if (transaction.type === "income") {
        current.income += amount;
      } else if (transaction.type === "expense") {
        current.expense += amount;
      }

      current.net = current.income - current.expense;
    });

    return Array.from(grouped.values()).sort(
      (a, b) => a.periodDate.getTime() - b.periodDate.getTime(),
    );
  }, [transactions, granularity]);

  const totalIncome = useMemo(
    () => sumByCategories(transactions.filter((t) => t.type === "income")),
    [transactions],
  );

  const totalExpense = useMemo(
    () => sumByCategories(transactions.filter((t) => t.type === "expense")),
    [transactions],
  );

  const depreciation = useMemo(
    () =>
      sumByCategories(
        transactions.filter((t) => t.type === "expense"),
        expenseGroups.depreciation,
      ),
    [transactions],
  );

  const totalCapex = useMemo(() => sumCapex(transactions), [transactions]);
  const financingTotal = useMemo(() => sumFinancing(transactions), [transactions]);

  const tableRows = useMemo(() => {
    const incomes = transactions.filter((t) => t.type === "income");
    const expenses = transactions.filter((t) => t.type === "expense");

    const rows = [
      {
        rubric: "I. Ingresos Operativos",
        items: "CRM (Instalaciones, Mensualidades, Talleres)",
        amount: sumByCategories(incomes, incomeGroups.crm),
      },
      {
        rubric: "I. Ingresos Operativos",
        items: "Desarrollo web y branding (Páginas, Hosting, Branding/Redes)",
        amount: sumByCategories(incomes, incomeGroups.webBranding),
      },
      {
        rubric: "I. Ingresos Operativos",
        items: "Proyectos especiales y comisiones",
        amount: sumByCategories(incomes, incomeGroups.projects),
      },
      {
        rubric: "I. Ingresos Operativos",
        items: "Otros ingresos (Reembolsos, Bonos)",
        amount: sumByCategories(incomes, incomeGroups.others),
      },
      {
        rubric: "—",
        items: "Total ingresos operativos",
        amount: sumByCategories(incomes),
      },
      {
        rubric: "II. Costos y Gastos Operativos",
        items: "Costo de ventas/servicios (Externos, Software)",
        amount: sumByCategories(expenses, expenseGroups.costOfSales),
      },
      {
        rubric: "II. Costos y Gastos Operativos",
        items: "Administración (Nómina, Contabilidad, Servicios)",
        amount: sumByCategories(expenses, expenseGroups.admin),
      },
      {
        rubric: "II. Costos y Gastos Operativos",
        items: "Marketing (Ads, Producción)",
        amount: sumByCategories(expenses, expenseGroups.marketing),
      },
      {
        rubric: "II. Costos y Gastos Operativos",
        items: "Gastos generales (Viáticos, Operación)",
        amount: sumByCategories(expenses, expenseGroups.general),
      },
      {
        rubric: "II. Costos y Gastos Operativos",
        items: "Depreciaciones y amortizaciones",
        amount: sumByCategories(expenses, expenseGroups.depreciation),
      },
      {
        rubric: "—",
        items: "Total egresos operativos",
        amount: sumByCategories(expenses),
      },
      {
        rubric: "III. Resultado Operativo",
        items: "EBITDA",
        amount: totalIncome - (totalExpense - depreciation),
      },
      {
        rubric: "III. Resultado Operativo",
        items: "EBIT",
        amount: totalIncome - totalExpense,
      },
      {
        rubric: "IV. Actividades de Inversión",
        items: "Capex y proyectos",
        amount: totalCapex,
      },
      {
        rubric: "V. Actividades de Financiamiento",
        items: "Aportes/Créditos/Dividendos",
        amount: financingTotal,
      },
      {
        rubric: "VI. Resultado final",
        items: "Flujo neto del periodo",
        amount: totalIncome - totalExpense + financingTotal - totalCapex,
      },
    ];

    return rows;
  }, [transactions, totalIncome, totalExpense, depreciation, totalCapex, financingTotal]);

  const ebitda = totalIncome - (totalExpense - depreciation);
  const ebit = ebitda - depreciation;

  const handleDownloadExcel = useCallback(() => {
    if (!tableRows.length) {
      return;
    }

    const escapeXml = (value: string) =>
      value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");

    const headerRow = ["Rubro", "Conceptos", "Monto (MXN)"];
    const dataRows = tableRows
      .map((row) => {
        const cells = [
          `<Cell><Data ss:Type="String">${escapeXml(row.rubric)}</Data></Cell>`,
          `<Cell><Data ss:Type="String">${escapeXml(row.items)}</Data></Cell>`,
          `<Cell ss:StyleID="sCurrency"><Data ss:Type="Number">${row.amount.toFixed(2)}</Data></Cell>`,
        ];
        return `<Row>${cells.join("")}</Row>`;
      })
      .join("");

    const headerXml = `<Row>${headerRow
      .map(
        (cell) =>
          `<Cell ss:StyleID="sHeader"><Data ss:Type="String">${escapeXml(cell)}</Data></Cell>`
      )
      .join("")}</Row>`;

    const worksheet = `<?xml version="1.0"?>\n<?mso-application progid="Excel.Sheet"?>\n<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">\n  <Styles>\n    <Style ss:ID="Default" ss:Name="Normal">\n      <Alignment ss:Vertical="Bottom"/>\n      <Borders/>\n      <Font ss:FontName="Inter" ss:Size="11"/>\n      <Interior/>\n      <NumberFormat/>\n      <Protection/>\n    </Style>\n    <Style ss:ID="sHeader">\n      <Font ss:Bold="1"/>\n      <Interior ss:Color="#F3F4F6" ss:Pattern="Solid"/>\n    </Style>\n    <Style ss:ID="sCurrency">\n      <NumberFormat ss:Format="&quot;$&quot;#,##0.00"/>\n    </Style>\n  </Styles>\n  <Worksheet ss:Name="Flujo por rubros">\n    <Table>\n      ${headerXml}\n      ${dataRows}\n    </Table>\n  </Worksheet>\n</Workbook>`;

    const fromLabel = dateRange?.from
      ? format(dateRange.from, "yyyyMMdd")
      : format(new Date(), "yyyyMMdd");
    const toLabel = dateRange?.to
      ? format(dateRange.to, "yyyyMMdd")
      : fromLabel;
    const fileName = `flujo_por_rubros_${fromLabel}${
      dateRange?.to ? `_a_${toLabel}` : ""
    }.xls`;

    const blob = new Blob([worksheet], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [dateRange, tableRows]);

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
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">💰 Flujo de Efectivo – Vela Digital</h1>
          <p className="text-muted-foreground">
            Análisis detallado de ingresos y egresos por categoría
          </p>
        </div>

        <Card className="shadow-elegant">
          <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between py-6">
            <div className="flex items-center gap-3">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="date-range"
                    variant="outline"
                    className="w-full md:w-auto justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formatDateRangeLabel(dateRange)}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={dateRange}
                    numberOfMonths={2}
                    onSelect={setDateRange}
                    defaultMonth={dateRange?.from}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Granularidad:</span>
              <ToggleGroup
                type="single"
                value={granularity}
                onValueChange={(value) => value && setGranularity(value as Granularity)}
                className="bg-muted/50 rounded-lg p-1"
              >
                <ToggleGroupItem value="day" className="px-3 py-1 text-sm">
                  Día
                </ToggleGroupItem>
                <ToggleGroupItem value="week" className="px-3 py-1 text-sm">
                  Semana
                </ToggleGroupItem>
                <ToggleGroupItem value="month" className="px-3 py-1 text-sm">
                  Mes
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-3">
          {[{ label: "Ingresos (I)", value: totalIncome }, { label: "Egresos (II)", value: totalExpense }, { label: "Flujo Neto", value: totalIncome - totalExpense }].map((item) => (
            <Card key={item.label} className="shadow-elegant">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  {item.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingData ? (
                  <Skeleton className="h-9 w-32" />
                ) : (
                  <p className="text-2xl font-semibold">
                    {currencyFormatter.format(item.value)}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="shadow-elegant h-full">
            <CardHeader>
              <CardTitle>Flujo neto en el tiempo</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingData ? (
                <div className="flex aspect-square items-center justify-center">
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <ChartContainer
                  className="aspect-square w-full rounded-xl border border-border/40 bg-gradient-to-br from-background via-background/80 to-muted/40 p-4"
                  config={{
                    income: { label: "Ingresos", color: "hsl(142, 72%, 45%)" },
                    expense: { label: "Egresos", color: "hsl(0, 84%, 60%)" },
                    net: { label: "Flujo neto", color: "var(--primary)" },
                  }}
                >
                  <LineChart data={cashflowSeries}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" tickLine={false} axisLine={false} />
                    <YAxis tickFormatter={(value) => currencyFormatter.format(value)} width={100} />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value) => currencyFormatter.format(Number(value))}
                        />
                      }
                    />
                    <Line type="monotone" dataKey="income" stroke="var(--color-income)" strokeWidth={2.4} dot={false} />
                    <Line type="monotone" dataKey="expense" stroke="var(--color-expense)" strokeWidth={2.4} dot={false} />
                    <Line type="monotone" dataKey="net" stroke="var(--color-net)" strokeWidth={2} strokeDasharray="6 4" dot={false} />
                  </LineChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-elegant h-full">
            <CardHeader>
              <CardTitle>Ingresos vs Egresos</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingData ? (
                <div className="flex aspect-square items-center justify-center">
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <ChartContainer
                  className="aspect-square w-full rounded-xl border border-border/40 bg-gradient-to-br from-background via-background/80 to-muted/40 p-4"
                  config={{
                    income: { label: "Ingresos", color: "hsl(142, 72%, 45%)" },
                    expense: { label: "Egresos", color: "hsl(0, 84%, 60%)" },
                  }}
                >
                  <BarChart data={cashflowSeries}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" tickLine={false} axisLine={false} />
                    <YAxis tickFormatter={(value) => currencyFormatter.format(value)} width={100} />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value) => currencyFormatter.format(Number(value))}
                        />
                      }
                    />
                    <Legend
                      wrapperStyle={{
                        paddingTop: 12,
                      }}
                    />
                    <Bar dataKey="income" stackId="cashflow" fill="var(--color-income)" radius={[8, 8, 4, 4]} />
                    <Bar dataKey="expense" stackId="cashflow" fill="var(--color-expense)" radius={[8, 8, 4, 4]} />
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-elegant">
          <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <CardTitle>Tabla de presentación — Flujo por rubros</CardTitle>
            {!loadingData && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={handleDownloadExcel}
              >
                <Download className="h-4 w-4" />
                Descargar Excel
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {loadingData ? (
              <div className="space-y-3">
                {Array.from({ length: 8 }).map((_, index) => (
                  <Skeleton key={index} className="h-8 w-full" />
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-1/4">Rubro</TableHead>
                    <TableHead className="w-1/2">Conceptos</TableHead>
                    <TableHead className="text-right">Monto (MXN)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableRows.map((row, index) => (
                    <TableRow key={`${row.items}-${index}`}>
                      <TableCell className="font-medium">{row.rubric}</TableCell>
                      <TableCell>{row.items}</TableCell>
                      <TableCell className="text-right">
                        {currencyFormatter.format(row.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-elegant">
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              EBITDA = Ingresos Operativos – (Costos + Gastos Operativos – Depreciaciones/Amortizaciones).
              EBIT = EBITDA – Depreciaciones – Amortizaciones.
            </p>
            {!loadingData && (
              <div className="pt-2 border-t text-xs">
                <p>EBITDA calculado: {currencyFormatter.format(ebitda)}</p>
                <p>EBIT calculado: {currencyFormatter.format(ebit)}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
