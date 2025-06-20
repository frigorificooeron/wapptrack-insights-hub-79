
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Info } from 'lucide-react';

const InstancesSettings = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Configuração de Instâncias
        </CardTitle>
        <CardDescription>
          Gerencie as instâncias do WhatsApp conectadas ao sistema
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Info className="h-4 w-4" />
          <span className="text-sm">
            As configurações de instância são gerenciadas através das campanhas individuais.
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default InstancesSettings;
