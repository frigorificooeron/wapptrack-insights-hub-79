
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { SharedAccessProvider, useSharedAccess } from '@/context/SharedAccessContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, EyeOff, Lock, Share2, Edit } from 'lucide-react';
import Dashboard from './Dashboard';
import Leads from './Leads';
import Campaigns from './Campaigns';
import Sales from './Sales';

const MODULES = [
  { key: 'dashboard', name: 'Dashboard', component: Dashboard },
  { key: 'leads', name: 'Leads', component: Leads },
  { key: 'campaigns', name: 'Campanhas', component: Campaigns },
  { key: 'sales', name: 'Vendas', component: Sales }
];

const SharedViewContent: React.FC = () => {
  const { isSharedMode, permissions, tokenInfo, loading, error, hasPermission } = useSharedAccess();
  const [activeModule, setActiveModule] = useState<string>('');

  useEffect(() => {
    if (permissions && !loading) {
      // Find the first module with view permission
      const firstViewableModule = MODULES.find(module => 
        hasPermission(module.key, 'view')
      );
      if (firstViewableModule) {
        setActiveModule(firstViewableModule.key);
      }
    }
  }, [permissions, loading, hasPermission]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Validando acesso...</p>
        </div>
      </div>
    );
  }

  if (error || !isSharedMode || !permissions || !tokenInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <Lock className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle>Acesso Negado</CardTitle>
            <CardDescription>
              {error || 'Este link compartilhado não existe, expirou ou foi desativado.'}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const getAvailableModules = () => {
    return MODULES.filter(module => hasPermission(module.key, 'view'));
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
                <h1 className="text-xl font-bold">{tokenInfo.name}</h1>
              </div>
              <Badge variant="secondary">Acesso Público</Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              {tokenInfo.expires_at && (
                <span>Válido até: {new Date(tokenInfo.expires_at).toLocaleDateString('pt-BR')}</span>
              )}
            </div>
          </div>
          {tokenInfo.description && (
            <div className="mt-2">
              <p className="text-sm text-muted-foreground">{tokenInfo.description}</p>
            </div>
          )}
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
                  {hasPermission(module.key, 'edit') && (
                    <Badge variant="outline" className="text-xs">
                      <Edit className="h-3 w-3 mr-1" />
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
          <div className="shared-view">
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

const SharedView: React.FC = () => {
  const { token } = useParams<{ token: string }>();

  return (
    <SharedAccessProvider token={token}>
      <SharedViewContent />
    </SharedAccessProvider>
  );
};

export default SharedView;
