import Layout from "@/components/Layout";
import { useRequireAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CashFlow() {
  const { user, loading } = useRequireAuth();

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
          <h1 className="text-3xl font-bold mb-2">💰 Flujo de Efectivo – Vela Digital</h1>
          <p className="text-muted-foreground">
            Análisis detallado de ingresos y egresos por categoría
          </p>
        </div>

        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle>I. INGRESOS OPERATIVOS</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">1. Ventas de servicios CRM</h3>
              <ul className="ml-6 space-y-1 text-sm text-muted-foreground">
                <li>• Instalaciones completas</li>
                <li>• Mensualidades del sistema</li>
                <li>• Talleres / capacitaciones</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">2. Desarrollo web y branding</h3>
              <ul className="ml-6 space-y-1 text-sm text-muted-foreground">
                <li>• Creación de páginas web / funnels</li>
                <li>• Hosting y mantenimiento</li>
                <li>• Branding y manejo de redes sociales</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">3. Proyectos especiales y comisiones</h3>
              <ul className="ml-6 space-y-1 text-sm text-muted-foreground">
                <li>• Participación con Sofex</li>
                <li>• Proyectos externos o referidos</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">4. Otros ingresos</h3>
              <ul className="ml-6 space-y-1 text-sm text-muted-foreground">
                <li>• Reembolsos / devoluciones</li>
                <li>• Bonos o incentivos</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle>II. COSTOS Y GASTOS OPERATIVOS</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">1. Costo de ventas / servicios</h3>
              <ul className="ml-6 space-y-1 text-sm text-muted-foreground">
                <li>• Programadores externos</li>
                <li>• Diseñadores / freelancers</li>
                <li>• Software (GoHighLevel, Zapier, Canva, ChatGPT, etc.)</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">2. Gastos de administración</h3>
              <ul className="ml-6 space-y-1 text-sm text-muted-foreground">
                <li>• Nómina del equipo (vendedores, operaciones, dirección)</li>
                <li>• Contabilidad y facturación</li>
                <li>• Renta / servicios / internet</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">3. Gastos de marketing</h3>
              <ul className="ml-6 space-y-1 text-sm text-muted-foreground">
                <li>• Meta Ads / Google Ads</li>
                <li>• Material audiovisual</li>
                <li>• Producción de campañas</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle>III. RESULTADO OPERATIVO</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>• EBITDA = Total ingresos operativos – (Costos + Gastos operativos – Depreciaciones y amortizaciones)</p>
            <p>• Depreciación y amortización = gastos no monetarios</p>
            <p>• EBIT = EBITDA – Depreciaciones – Amortizaciones</p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
