import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { 
  Share2, 
  Plus, 
  Copy, 
  Calendar as CalendarIcon, 
  Trash2, 
  Edit, 
  Eye, 
  Settings,
  Users,
  BarChart3,
  Target,
  DollarSign,
  ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { SharedAccessService, SharedAccessPermissions, SharedAccessToken, CreateTokenRequest } from '@/services/sharedAccessService';

const MODULES = [
  { key: 'dashboard', label: 'Dashboard', icon: BarChart3, description: 'Visão geral e métricas' },
  { key: 'leads', label: 'Leads', icon: Users, description: 'Gerenciamento de leads' },
  { key: 'campaigns', label: 'Campanhas', icon: Target, description: 'Campanhas de marketing' },
  { key: 'sales', label: 'Vendas', icon: DollarSign, description: 'Controle de vendas' },
  { key: 'settings', label: 'Configurações', icon: Settings, description: 'Configurações do sistema' },
] as const;

interface PermissionToggleProps {
  module: typeof MODULES[0];
  permissions: SharedAccessPermissions;
  onChange: (permissions: SharedAccessPermissions) => void;
}

const PermissionToggle: React.FC<PermissionToggleProps> = ({ module, permissions, onChange }) => {
  const modulePermissions = permissions[module.key as keyof SharedAccessPermissions] || { view: false, edit: false };
  const Icon = module.icon;

  const updatePermission = (type: 'view' | 'edit', value: boolean) => {
    const newPermissions = {
      ...permissions,
      [module.key]: {
        ...modulePermissions,
        [type]: value,
        // If disabling view, also disable edit
        ...(type === 'view' && !value ? { edit: false } : {}),
        // If enabling edit, also enable view
        ...(type === 'edit' && value ? { view: true } : {}),
      }
    };
    onChange(newPermissions);
  };

  return (
    <Card className="p-4">
      <div className="flex items-start space-x-3">
        <Icon className="h-5 w-5 mt-1 text-muted-foreground" />
        <div className="flex-1 space-y-3">
          <div>
            <h4 className="font-medium">{module.label}</h4>
            <p className="text-sm text-muted-foreground">{module.description}</p>
          </div>
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <Switch
                id={`${module.key}-view`}
                checked={modulePermissions.view}
                onCheckedChange={(checked) => updatePermission('view', checked)}
              />
              <Label htmlFor={`${module.key}-view`} className="text-sm">
                <Eye className="h-4 w-4 inline mr-1" />
                Visualizar
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id={`${module.key}-edit`}
                checked={modulePermissions.edit}
                onCheckedChange={(checked) => updatePermission('edit', checked)}
                disabled={!modulePermissions.view}
              />
              <Label htmlFor={`${module.key}-edit`} className="text-sm">
                <Edit className="h-4 w-4 inline mr-1" />
                Editar
              </Label>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

interface CreateTokenDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTokenCreated: () => void;
}

const CreateTokenDialog: React.FC<CreateTokenDialogProps> = ({ open, onOpenChange, onTokenCreated }) => {
  const [formData, setFormData] = useState<CreateTokenRequest>({
    name: '',
    description: '',
    permissions: {},
  });
  const [expiryDate, setExpiryDate] = useState<Date>();
  const [isCreating, setIsCreating] = useState(false);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      permissions: {},
    });
    setExpiryDate(undefined);
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    // Check if at least one permission is granted
    const hasPermissions = Object.values(formData.permissions).some(
      (module) => module?.view || module?.edit
    );

    if (!hasPermissions) {
      toast.error('Pelo menos uma permissão deve ser concedida');
      return;
    }

    setIsCreating(true);
    try {
      await SharedAccessService.createToken({
        ...formData,
        expires_at: expiryDate?.toISOString(),
      });

      toast.success('Token criado com sucesso!');
      resetForm();
      onOpenChange(false);
      onTokenCreated();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao criar token');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Link de Acesso Compartilhado</DialogTitle>
          <DialogDescription>
            Configure as permissões e crie um link para compartilhar acesso limitado ao sistema.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nome do Link *</Label>
              <Input
                id="name"
                placeholder="Ex: Acesso Cliente ABC"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Textarea
                id="description"
                placeholder="Descreva o propósito deste link..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div>
              <Label>Data de Expiração (opcional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !expiryDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {expiryDate ? format(expiryDate, "PPP", { locale: ptBR }) : "Selecionar data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={expiryDate}
                    onSelect={setExpiryDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {expiryDate && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpiryDate(undefined)}
                  className="mt-2"
                >
                  Remover data de expiração
                </Button>
              )}
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="text-lg font-medium mb-4">Permissões por Módulo</h3>
            <div className="space-y-3">
              {MODULES.map((module) => (
                <PermissionToggle
                  key={module.key}
                  module={module}
                  permissions={formData.permissions}
                  onChange={(permissions) => setFormData({ ...formData, permissions })}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={isCreating}>
              {isCreating ? 'Criando...' : 'Criar Link'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface TokenCardProps {
  token: SharedAccessToken;
  onUpdate: () => void;
}

const TokenCard: React.FC<TokenCardProps> = ({ token, onUpdate }) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleCopyLink = () => {
    const url = SharedAccessService.generateShareableUrl(token.token);
    navigator.clipboard.writeText(url);
    toast.success('Link copiado para a área de transferência!');
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await SharedAccessService.deactivateToken(token.id);
      toast.success('Token desativado com sucesso!');
      onUpdate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao desativar token');
    } finally {
      setIsDeleting(false);
    }
  };

  const getPermissionsSummary = () => {
    const permissions = Object.entries(token.permissions)
      .filter(([_, perms]) => perms?.view || perms?.edit)
      .map(([module, perms]) => {
        const moduleInfo = MODULES.find(m => m.key === module);
        if (!moduleInfo) return null;
        
        const access = [];
        if (perms?.view) access.push('Ver');
        if (perms?.edit) access.push('Editar');
        
        return `${moduleInfo.label} (${access.join(', ')})`;
      })
      .filter(Boolean);

    return permissions.length > 0 ? permissions.join(', ') : 'Nenhuma permissão';
  };

  const isExpired = token.expires_at && new Date(token.expires_at) < new Date();

  return (
    <Card className={cn("relative", isExpired && "opacity-60")}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{token.name}</CardTitle>
            {token.description && (
              <CardDescription className="mt-1">{token.description}</CardDescription>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {isExpired && <Badge variant="destructive">Expirado</Badge>}
            {!token.is_active && <Badge variant="secondary">Inativo</Badge>}
            {token.is_active && !isExpired && <Badge variant="default">Ativo</Badge>}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium">Permissões:</Label>
            <p className="text-sm text-muted-foreground mt-1">{getPermissionsSummary()}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <Label className="text-sm font-medium">Criado em:</Label>
              <p className="text-muted-foreground">
                {format(new Date(token.created_at), "PPP", { locale: ptBR })}
              </p>
            </div>
            {token.expires_at && (
              <div>
                <Label className="text-sm font-medium">Expira em:</Label>
                <p className="text-muted-foreground">
                  {format(new Date(token.expires_at), "PPP", { locale: ptBR })}
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              disabled={!token.is_active || isExpired}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copiar Link
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const url = SharedAccessService.generateShareableUrl(token.token);
                window.open(url, '_blank');
              }}
              disabled={!token.is_active || isExpired}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Abrir
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={isDeleting}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Desativar
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Desativar Token</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tem certeza que deseja desativar este token? Esta ação não pode ser desfeita e o link parará de funcionar.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>
                    Desativar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const SharedAccessManager: React.FC = () => {
  const [tokens, setTokens] = useState<SharedAccessToken[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const loadTokens = async () => {
    try {
      const userTokens = await SharedAccessService.getUserTokens();
      setTokens(userTokens);
    } catch (error) {
      toast.error('Erro ao carregar tokens');
      console.error('Error loading tokens:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTokens();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Carregando tokens...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Acesso Compartilhado</h2>
          <p className="text-muted-foreground">
            Crie links para compartilhar acesso limitado ao sistema com clientes ou parceiros.
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Criar Link
        </Button>
      </div>

      {tokens.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Share2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum link criado ainda</h3>
            <p className="text-muted-foreground text-center mb-4">
              Crie seu primeiro link de acesso compartilhado para permitir que outros vejam dados específicos do sistema.
            </p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeiro Link
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {tokens.map((token) => (
            <TokenCard key={token.id} token={token} onUpdate={loadTokens} />
          ))}
        </div>
      )}

      <CreateTokenDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onTokenCreated={loadTokens}
      />
    </div>
  );
};

