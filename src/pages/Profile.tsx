import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRequireAuth } from "@/hooks/useAuth";

const Profile = () => {
  const { user, loading } = useRequireAuth();

  if (loading) {
    return (
      <Layout user={user}>
        <div className="flex h-64 items-center justify-center">
          <p className="text-muted-foreground">Cargando información...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout user={user}>
      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="text-4xl font-bold">Perfil</h1>
          <p className="text-muted-foreground">Administra los detalles de tu cuenta.</p>
        </div>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Información principal</CardTitle>
            <CardDescription>Datos básicos sincronizados con tu sesión de Supabase.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Correo</p>
              <p className="text-lg font-semibold">{user?.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">ID de usuario</p>
              <code className="inline-block rounded bg-muted px-2 py-1 text-xs">{user?.id}</code>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Estado</p>
              <Badge variant="secondary">Activo</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Profile;
