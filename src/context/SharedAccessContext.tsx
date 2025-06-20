
import React, { createContext, useContext, useEffect, useState } from 'react';

interface SharedAccessContextType {
  isSharedAccess: boolean;
  permissions: any;
  isReadOnly: boolean;
  hasPermission: (module: string, type: 'read' | 'write') => boolean;
}

const SharedAccessContext = createContext<SharedAccessContextType>({
  isSharedAccess: false,
  permissions: {},
  isReadOnly: true,
  hasPermission: () => false
});

export const useSharedAccess = () => useContext(SharedAccessContext);

export const SharedAccessProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sharedData, setSharedData] = useState<any>(null);

  useEffect(() => {
    // Verificar se estamos em uma visualização compartilhada
    const sharedElement = document.querySelector('.shared-view');
    if (sharedElement) {
      try {
        const data = JSON.parse(sharedElement.getAttribute('data-shared-link') || '{}');
        setSharedData(data);
      } catch (error) {
        console.error('Error parsing shared link data:', error);
      }
    } else {
      setSharedData(null);
    }
  }, []);

  const hasPermission = (module: string, type: 'read' | 'write') => {
    if (!sharedData?.permissions) return false;
    return sharedData.permissions[module]?.[type] || false;
  };

  const value = {
    isSharedAccess: !!sharedData,
    permissions: sharedData?.permissions || {},
    isReadOnly: sharedData?.readOnly || false,
    hasPermission
  };

  return (
    <SharedAccessContext.Provider value={value}>
      {children}
    </SharedAccessContext.Provider>
  );
};
