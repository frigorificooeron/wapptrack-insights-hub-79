
import React from 'react';
import { Button } from '@/components/ui/button';
import MainLayout from '@/components/MainLayout';
import CompanySettings from '@/components/settings/CompanySettings';
import ThemeSettings from '@/components/settings/ThemeSettings';
import EvolutionApiSettings from '@/components/settings/EvolutionApiSettings';
import InstancesSettings from '@/components/settings/InstancesSettings';
import SharedLinksSettings from '@/components/settings/SharedLinksSettings';
import { SharedAccessManager } from '@/components/SharedAccessManager';
import { useSettings } from '@/hooks/useSettings';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const Settings = () => {
  const {
    loading,
    uploading,
    testingEvolution,
    formData,
    evolutionConfig,
    handleInputChange,
    handleEvolutionConfigChange,
    saveEvolutionConfig,
    testEvolutionConnection,
    handleThemeChange,
    handleFileUpload,
    handleSave
  } = useSettings();

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Configurações</h1>
          <p className="text-muted-foreground">
            Gerencie as configurações da sua empresa e integrações
          </p>
        </div>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="general">Configurações Gerais</TabsTrigger>
            <TabsTrigger value="shared-access">Acesso Compartilhado</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6">
            <div className="grid gap-6">
              <CompanySettings
                formData={formData}
                uploading={uploading}
                onInputChange={handleInputChange}
                onFileUpload={handleFileUpload}
              />

              <ThemeSettings
                theme={formData.theme}
                onThemeChange={handleThemeChange}
              />

              <EvolutionApiSettings
                evolutionConfig={evolutionConfig}
                testingWebhook={testingEvolution}
                onEvolutionConfigChange={handleEvolutionConfigChange}
                onSaveEvolutionConfig={saveEvolutionConfig}
                onTestWebhookConnection={testEvolutionConnection}
              />

              <InstancesSettings />

              <SharedLinksSettings />

              <div className="flex justify-end">
                <Button 
                  onClick={handleSave} 
                  disabled={loading}
                  className="min-w-[120px]"
                >
                  {loading ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="shared-access">
            <SharedAccessManager />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Settings;
