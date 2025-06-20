
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Share2, Copy, Trash2, Edit2, Plus, Eye, EyeOff } from 'lucide-react';
import { useSharedLinks } from '@/hooks/useSharedLinks';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';

const SharedLinksSettings = () => {
  const { 
    sharedLinks, 
    loading, 
    createSharedLink, 
    updateSharedLink, 
    deleteSharedLink 
  } = useSharedLinks();
  
  const [isCreating, setIsCreating] = useState(false);
  const [editingLink, setEditingLink] = useState<any>(null);
  const [newLinkData, setNewLinkData] = useState({
    name: '',
    expiresAt: '',
    permissions: {
      dashboard: { read: false, write: false },
      leads: { read: false, write: false },
      campaigns: { read: false, write: false },
      sales: { read: false, write: false }
    }
  });

  const copyToClipboard = (token: string) => {
    const url = `${window.location.origin}/shared/${token}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copiado para a área de transferência!');
  };

  const handleCreateLink = async () => {
    if (!newLinkData.name.trim()) {
      toast.error('Por favor, informe um nome para o link');
      return;
    }

    try {
      await createSharedLink(newLinkData);
      setIsCreating(false);
      setNewLinkData({
        name: '',
        expiresAt: '',
        permissions: {
          dashboard: { read: false, write: false },
          leads: { read: false, write: false },
          campaigns: { read: false, write: false },
          sales: { read: false, write: false }
        }
      });
      toast.success('Link compartilhável criado com sucesso!');
    } catch (error) {
      toast.error('Erro ao criar link compartilhável');
    }
  };

  const handleUpdatePermission = (module: string, type: 'read' | 'write', value: boolean) => {
    setNewLinkData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [module]: {
          ...prev.permissions[module],
          [type]: value
        }
      }
    }));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Share2 className="h-5 w-5" />
          Links Compartilháveis
        </CardTitle>
        <CardDescription>
          Crie links para compartilhar acesso público a módulos específicos do sistema
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-medium">Links Ativos</h3>
            <p className="text-sm text-muted-foreground">
              {sharedLinks.length} link(s) compartilhado(s)
            </p>
          </div>
          <Dialog open={isCreating} onOpenChange={setIsCreating}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Link
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Criar Link Compartilhável</DialogTitle>
                <DialogDescription>
                  Configure as permissões e detalhes do novo link de acesso público
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Nome do Link</Label>
                  <Input
                    id="name"
                    value={newLinkData.name}
                    onChange={(e) => setNewLinkData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: Dashboard Público, Relatório Mensal..."
                  />
                </div>
                
                <div>
                  <Label htmlFor="expires">Data de Expiração (opcional)</Label>
                  <Input
                    id="expires"
                    type="datetime-local"
                    value={newLinkData.expiresAt}
                    onChange={(e) => setNewLinkData(prev => ({ ...prev, expiresAt: e.target.value }))}
                  />
                </div>
                
                <Separator />
                
                <div>
                  <h4 className="font-medium mb-3">Permissões por Módulo</h4>
                  <div className="space-y-4">
                    {Object.entries(newLinkData.permissions).map(([module, perms]) => (
                      <div key={module} className="border rounded-lg p-4">
                        <h5 className="font-medium mb-2 capitalize">{module}</h5>
                        <div className="flex items-center gap-6">
                          <div className="flex items-center space-x-2">
                            <Switch
                              id={`${module}-read`}
                              checked={perms.read}
                              onCheckedChange={(checked) => handleUpdatePermission(module, 'read', checked)}
                            />
                            <Label htmlFor={`${module}-read`} className="flex items-center gap-1">
                              <Eye className="h-4 w-4" />
                              Visualizar
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch
                              id={`${module}-write`}
                              checked={perms.write}
                              onCheckedChange={(checked) => handleUpdatePermission(module, 'write', checked)}
                            />
                            <Label htmlFor={`${module}-write`} className="flex items-center gap-1">
                              <Edit2 className="h-4 w-4" />
                              Editar
                            </Label>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreating(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateLink}>
                  Criar Link
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        
        {loading ? (
          <div className="text-center py-4">Carregando links...</div>
        ) : (
          <div className="space-y-3">
            {sharedLinks.map((link) => (
              <div key={link.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{link.name}</h4>
                    {!link.is_active && <Badge variant="secondary">Inativo</Badge>}
                    {isExpired(link.expires_at) && <Badge variant="destructive">Expirado</Badge>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(link.token)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteSharedLink(link.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="text-sm text-muted-foreground mb-2">
                  <div>Token: {link.token}</div>
                  <div>Criado em: {formatDate(link.created_at)}</div>
                  {link.expires_at && (
                    <div>Expira em: {formatDate(link.expires_at)}</div>
                  )}
                </div>
                
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(link.permissions as any).map(([module, perms]: [string, any]) => (
                    <div key={module}>
                      {perms.read && (
                        <Badge variant="outline" className="text-xs">
                          {module} <Eye className="h-3 w-3 ml-1" />
                        </Badge>
                      )}
                      {perms.write && (
                        <Badge variant="outline" className="text-xs ml-1">
                          {module} <Edit2 className="h-3 w-3 ml-1" />
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            
            {sharedLinks.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Share2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum link compartilhável criado ainda</p>
                <p className="text-sm">Clique em "Novo Link" para começar</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SharedLinksSettings;
