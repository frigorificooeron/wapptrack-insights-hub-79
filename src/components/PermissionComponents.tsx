import React from 'react';
import { useSharedAccess } from '@/context/SharedAccessContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, EyeOff, Lock } from 'lucide-react';

interface PermissionWrapperProps {
  module: string;
  action: 'view' | 'edit';
  children: React.ReactNode;
  fallback?: React.ReactNode;
  className?: string;
}

export const PermissionWrapper: React.FC<PermissionWrapperProps> = ({
  module,
  action,
  children,
  fallback,
  className
}) => {
  const { hasPermission, isSharedMode } = useSharedAccess();

  if (!hasPermission(module, action)) {
    if (fallback) {
      return <>{fallback}</>;
    }
    
    if (action === 'view') {
      return null; // Hide completely if no view permission
    }
    
    // For edit permission, show disabled version
    return (
      <div className={`relative ${className || ''}`}>
        <div className="opacity-50 pointer-events-none">
          {children}
        </div>
        {isSharedMode && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Lock className="h-3 w-3" />
              Somente leitura
            </Badge>
          </div>
        )}
      </div>
    );
  }

  return <>{children}</>;
};

interface RestrictedButtonProps extends React.ComponentProps<typeof Button> {
  module: string;
  action?: 'view' | 'edit';
}

export const RestrictedButton: React.FC<RestrictedButtonProps> = ({
  module,
  action = 'edit',
  children,
  disabled,
  ...props
}) => {
  const { hasPermission, isSharedMode } = useSharedAccess();
  const hasAccess = hasPermission(module, action);

  if (!hasAccess && action === 'view') {
    return null;
  }

  return (
    <Button
      {...props}
      disabled={disabled || (!hasAccess && isSharedMode)}
    >
      {children}
    </Button>
  );
};

interface RestrictedInputProps extends React.ComponentProps<typeof Input> {
  module: string;
  action?: 'view' | 'edit';
}

export const RestrictedInput: React.FC<RestrictedInputProps> = ({
  module,
  action = 'edit',
  disabled,
  ...props
}) => {
  const { hasPermission, isSharedMode } = useSharedAccess();
  const hasAccess = hasPermission(module, action);

  if (!hasPermission(module, 'view')) {
    return null;
  }

  return (
    <Input
      {...props}
      disabled={disabled || (!hasAccess && isSharedMode)}
      readOnly={!hasAccess && isSharedMode}
    />
  );
};

interface RestrictedTextareaProps extends React.ComponentProps<typeof Textarea> {
  module: string;
  action?: 'view' | 'edit';
}

export const RestrictedTextarea: React.FC<RestrictedTextareaProps> = ({
  module,
  action = 'edit',
  disabled,
  ...props
}) => {
  const { hasPermission, isSharedMode } = useSharedAccess();
  const hasAccess = hasPermission(module, action);

  if (!hasPermission(module, 'view')) {
    return null;
  }

  return (
    <Textarea
      {...props}
      disabled={disabled || (!hasAccess && isSharedMode)}
      readOnly={!hasAccess && isSharedMode}
    />
  );
};

interface RestrictedSelectProps extends React.ComponentProps<typeof Select> {
  module: string;
  action?: 'view' | 'edit';
  children: React.ReactNode;
}

export const RestrictedSelect: React.FC<RestrictedSelectProps> = ({
  module,
  action = 'edit',
  disabled,
  children,
  ...props
}) => {
  const { hasPermission, isSharedMode } = useSharedAccess();
  const hasAccess = hasPermission(module, action);

  if (!hasPermission(module, 'view')) {
    return null;
  }

  return (
    <Select
      {...props}
      disabled={disabled || (!hasAccess && isSharedMode)}
    >
      {children}
    </Select>
  );
};

interface SharedModeIndicatorProps {
  className?: string;
}

export const SharedModeIndicator: React.FC<SharedModeIndicatorProps> = ({ className }) => {
  const { isSharedMode, tokenInfo } = useSharedAccess();

  if (!isSharedMode || !tokenInfo) {
    return null;
  }

  return (
    <Card className={`border-orange-200 bg-orange-50 ${className || ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-orange-600" />
          <CardTitle className="text-sm text-orange-800">Modo de Visualização Compartilhada</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <CardDescription className="text-orange-700">
          Você está visualizando este conteúdo através do link compartilhado "{tokenInfo.name}".
          Algumas funcionalidades podem estar limitadas.
        </CardDescription>
      </CardContent>
    </Card>
  );
};

// Hook para verificar permissões em componentes
export const usePermissions = () => {
  const { hasPermission, isSharedMode } = useSharedAccess();
  
  return {
    hasPermission,
    isSharedMode,
    canView: (module: string) => hasPermission(module, 'view'),
    canEdit: (module: string) => hasPermission(module, 'edit'),
  };
};

