
import React from 'react';

interface PublicRouteProps {
  children: React.ReactNode;
}

const PublicRoute: React.FC<PublicRouteProps> = ({ children }) => {
  // Componente para rotas públicas que não requerem autenticação
  return <>{children}</>;
};

export default PublicRoute;
