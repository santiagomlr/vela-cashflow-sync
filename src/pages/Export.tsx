import Layout from "@/components/Layout";
import { useRequireAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileSpreadsheet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Export() {
  const { user, loading } = useRequireAuth();
  const { toast } = useToast();

  const handleExport = () => {
    toast({
      title: "Próximamente",
      description: "La exportación a Excel estará disponible pronto.",
    });
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
              <Button onClick={handleExport} size="lg">
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Exportar Datos
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
