import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { SharedAccessService, SharedAccessPermissions } from '@/services/sharedAccessService';

interface SharedAccessContextType {
  isSharedMode: boolean;
  permissions: SharedAccessPermissions | null;
  tokenInfo: {
    name: string;
    description?: string;
    created_at: string;
    expires_at?: string;
  } | null;
  loading: boolean;
  error: string | null;
  hasPermission: (module: string, action: 'view' | 'edit') => boolean;
}

const SharedAccessContext = createContext<SharedAccessContextType | undefined>(undefined);

interface SharedAccessProviderProps {
  children: ReactNode;
  token?: string;
}

export const SharedAccessProvider: React.FC<SharedAccessProviderProps> = ({ children, token }) => {
  const [isSharedMode, setIsSharedMode] = useState(!!token);
  const [permissions, setPermissions] = useState<SharedAccessPermissions | null>(null);
  const [tokenInfo, setTokenInfo] = useState<SharedAccessContextType['tokenInfo']>(null);
  const [loading, setLoading] = useState(!!token);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      validateToken(token);
    } else {
      setIsSharedMode(false);
      setPermissions(null);
      setTokenInfo(null);
      setLoading(false);
      setError(null);
    }
  }, [token]);

  const validateToken = async (tokenValue: string) => {
    setLoading(true);
    setError(null);

    try {
      const result = await SharedAccessService.validateToken(tokenValue);
      
      if (result) {
        setIsSharedMode(true);
        setPermissions(result.permissions);
        setTokenInfo({
          name: result.name,
          description: result.description,
          created_at: result.created_at,
          expires_at: result.expires_at,
        });
      } else {
        setError('Token inválido ou expirado');
        setIsSharedMode(false);
        setPermissions(null);
        setTokenInfo(null);
      }
    } catch (err) {
      setError('Erro ao validar token');
      setIsSharedMode(false);
      setPermissions(null);
      setTokenInfo(null);
      console.error('Token validation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = (module: string, action: 'view' | 'edit'): boolean => {
    if (!isSharedMode || !permissions) {
      return true; // Full access when not in shared mode
    }

    const modulePermissions = permissions[module as keyof SharedAccessPermissions];
    if (!modulePermissions) {
      return false;
    }

    return modulePermissions[action] === true;
  };

  const value: SharedAccessContextType = {
    isSharedMode,
    permissions,
    tokenInfo,
    loading,
    error,
    hasPermission,
  };

  return (
    <SharedAccessContext.Provider value={value}>
      {children}
    </SharedAccessContext.Provider>
  );
};

export const useSharedAccess = (): SharedAccessContextType => {
  const context = useContext(SharedAccessContext);
  if (context === undefined) {
    throw new Error('useSharedAccess must be used within a SharedAccessProvider');
  }
  return context;
};

