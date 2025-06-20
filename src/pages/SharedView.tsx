
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useSharedLinks } from '@/hooks/useSharedLinks';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, EyeOff, Lock, Share2 } from 'lucide-react';
import Dashboard from './Dashboard';
import Leads from './Leads';
import Campaigns from './Campaigns';
import Sales from './Sales';

const SharedView = () => {
  const { token } = useParams<{ token: string }>();
  const { getSharedLinkByToken } = useSharedLinks();
  const [sharedLink, setSharedLink] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeModule, setActiveModule] = useState<string>('');

  useEffect(() => {
    const loadSharedLink = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      const link = await getSharedLinkByToken(token);
      setSharedLink(link);
      
      // Definir o primeiro módulo com permissão de leitura como ativo
      if (link?.permissions) {
        const firstReadableModule = Object.entries(link.permissions as any)
          .find(([_, perms]: [string, any]) => perms.read)?.[0];
        setActiveModule(firstReadableModule || '');
      }
      
      setLoading(false);
    };

    loadSharedLink();
  }, [token, getSharedLinkByToken]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!sharedLink) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <Lock className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle>Acesso Negado</CardTitle>
            <CardDescription>
              Este link compartilhado não existe, expirou ou foi desativado.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const hasReadPermission = (module: string) => {
    return sharedLink.permissions?.[module]?.read || false;
  };

  const hasWritePermission = (module: string) => {
    return sharedLink.permissions?.[module]?.write || false;
  };

  const getAvailableModules = () => {
    const modules = [
      { key: 'dashboard', name: 'Dashboard', component: Dashboard },
      { key: 'leads', name: 'Leads', component: Leads },
      { key: 'campaigns', name: 'Links de rastreamento', component: Campaigns },
      { key: 'sales', name: 'Vendas', component: Sales }
    ];

    return modules.filter(module => hasReadPermission(module.key));
  };

  const availableModules = getAvailableModules();
  const ActiveComponent = availableModules.find(m => m.key === activeModule)?.component;

  return (
    <div className="min-h-screen bg-background">
      {/* Header público */}
      <div className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Share2 className="h-6 w-6 text-primary" />
                <h1 className="text-xl font-bold">{sharedLink.name}</h1>
              </div>
              <Badge variant="secondary">Acesso Público</Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              {sharedLink.expires_at && (
                <span>Válido até: {new Date(sharedLink.expires_at).toLocaleDateString('pt-BR')}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navegação dos módulos */}
      {availableModules.length > 1 && (
        <div className="bg-card border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex space-x-8">
              {availableModules.map((module) => (
                <button
                  key={module.key}
                  onClick={() => setActiveModule(module.key)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                    activeModule === module.key
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Eye className="h-4 w-4" />
                  {module.name}
                  {hasWritePermission(module.key) && (
                    <Badge variant="outline" className="text-xs">
                      Edição
                    </Badge>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Conteúdo principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {availableModules.length === 0 ? (
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
                <EyeOff className="h-6 w-6 text-yellow-600" />
              </div>
              <CardTitle>Nenhum Módulo Disponível</CardTitle>
              <CardDescription>
                Este link não possui permissões de visualização para nenhum módulo.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : ActiveComponent ? (
          <div className="shared-view" data-shared-link={JSON.stringify({
            token: sharedLink.token,
            permissions: sharedLink.permissions,
            readOnly: !hasWritePermission(activeModule)
          })}>
            <ActiveComponent />
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Selecione um módulo</CardTitle>
              <CardDescription>
                Escolha um dos módulos disponíveis na navegação acima.
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </main>
    </div>
  );
};

export default SharedView;
