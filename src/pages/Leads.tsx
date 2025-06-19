
import React, { useEffect, useState } from 'react';
import MainLayout from '@/components/MainLayout';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getLeads, getCampaigns } from '@/services/dataService';
import { Lead, Campaign } from '@/types';
import { Plus } from 'lucide-react';
import { useLeadOperations } from '@/hooks/useLeadOperations';
import LeadsTable from '@/components/leads/LeadsTable';
import LeadDialog from '@/components/leads/LeadDialog';
import LeadDetailDialog from '@/components/leads/LeadDetailDialog';
import PendingLeadConverter from '@/components/leads/PendingLeadConverter';
import { toast } from "sonner";
import { supabase } from '@/integrations/supabase/client';
import { useProject } from '@/context/ProjectContext';

const Leads = () => {
  const { activeProject } = useProject();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const {
    isDialogOpen,
    setIsDialogOpen,
    isDetailDialogOpen,
    setIsDetailDialogOpen,
    dialogMode,
    currentLead,
    selectedLead,
    handleInputChange,
    handlePhoneChange,
    handleSelectChange,
    handleOpenAddDialog,
    handleOpenEditDialog,
    handleOpenViewDialog,
    handleSaveLead,
    handleSaveFromDetailDialog,
    handleDeleteLead,
    openWhatsApp
  } = useLeadOperations(leads, setLeads, activeProject?.id);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      console.log('🔄 Iniciando busca de dados...', { activeProject: activeProject?.id });
      
      const [leadsData, campaignsData] = await Promise.all([
        getLeads(activeProject?.id), // 🎯 Passar o ID do projeto ativo
        getCampaigns()
      ]);
      
      console.log('📋 Dados brutos do getLeads():', leadsData);
      
      // Garantir que os dados estão sendo processados corretamente
      const processedLeads = leadsData.map(lead => {
        console.log(`🔍 Processando lead ${lead.name}:`, {
          id: lead.id,
          client_id: lead.client_id,
          project_name: activeProject?.name,
          last_message: lead.last_message,
          last_message_type: typeof lead.last_message,
          last_message_raw: JSON.stringify(lead.last_message)
        });
        
        return {
          ...lead,
          last_message: lead.last_message || null
        };
      });
      
      console.log('✅ Leads processados para projeto:', {
        projectId: activeProject?.id,
        projectName: activeProject?.name,
        totalLeads: processedLeads.length,
        leads: processedLeads.map(lead => ({
          name: lead.name,
          phone: lead.phone,
          client_id: lead.client_id,
          last_message: lead.last_message,
          status: lead.status
        }))
      });
      
      setLeads(processedLeads);
      setCampaigns(campaignsData);
    } catch (error) {
      console.error('Error fetching leads data:', error);
      toast.error('Erro ao carregar dados dos leads');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Configurar escuta em tempo real para mudanças na tabela de leads
    console.log('🎧 Configurando escuta em tempo real para leads...', { activeProject: activeProject?.id });
    const channel = supabase
      .channel('leads-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Escuta INSERT, UPDATE e DELETE
          schema: 'public',
          table: 'leads'
        },
        (payload) => {
          console.log('📡 Mudança detectada na tabela leads:', payload);
          console.log('📡 Payload completo:', JSON.stringify(payload, null, 2));
          
          if (payload.eventType === 'INSERT') {
            console.log('➕ Novo lead adicionado:', payload.new);
            const newLead = payload.new as Lead;
            
            // 🎯 Verificar se o lead pertence ao projeto ativo
            if (!activeProject?.id || newLead.client_id === activeProject.id) {
              console.log('➕ Lead pertence ao projeto ativo, adicionando à lista');
              const processedLead = {
                ...newLead,
                last_message: newLead.last_message || null
              };
              
              setLeads(prev => {
                const newLeads = [processedLead, ...prev];
                console.log('➕ Estado atualizado após INSERT:', newLeads.length, 'leads');
                return newLeads;
              });
              toast.success(`Novo lead adicionado: ${processedLead.name}`);
            } else {
              console.log('➕ Lead não pertence ao projeto ativo, ignorando');
            }
          } 
          else if (payload.eventType === 'UPDATE') {
            console.log('📝 Lead atualizado:', payload.new);
            const updatedLead = payload.new as Lead;
            
            // 🎯 Verificar se o lead pertence ao projeto ativo
            if (!activeProject?.id || updatedLead.client_id === activeProject.id) {
              const processedLead = {
                ...updatedLead,
                last_message: updatedLead.last_message || null
              };
              
              setLeads(prev => {
                const updatedLeads = prev.map(lead => 
                  lead.id === processedLead.id ? processedLead : lead
                );
                console.log('📝 Estado atualizado após UPDATE');
                return updatedLeads;
              });
              
              // Se uma mensagem foi adicionada, mostrar notificação
              if (processedLead.last_message) {
                console.log('💬 Nova mensagem detectada:', processedLead.last_message);
                toast.info(`Nova mensagem de ${processedLead.name}: ${processedLead.last_message.substring(0, 50)}${processedLead.last_message.length > 50 ? '...' : ''}`);
              }
            } else {
              console.log('📝 Lead atualizado não pertence ao projeto ativo, ignorando');
            }
          }
          else if (payload.eventType === 'DELETE') {
            console.log('🗑️ Lead removido:', payload.old);
            const deletedLead = payload.old as Lead;
            setLeads(prev => prev.filter(lead => lead.id !== deletedLead.id));
            toast.info(`Lead removido: ${deletedLead.name}`);
          }
        }
      )
      .subscribe();

    // Cleanup: remover a escuta quando o componente for desmontado
    return () => {
      console.log('🔌 Removendo escuta em tempo real...');
      supabase.removeChannel(channel);
    };
  }, [activeProject?.id]); // 🎯 Recarregar quando o projeto ativo mudar

  const filteredLeads = leads.filter((lead) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      lead.name.toLowerCase().includes(searchLower) ||
      lead.phone.toLowerCase().includes(searchLower) ||
      lead.campaign.toLowerCase().includes(searchLower) ||
      lead.status.toLowerCase().includes(searchLower) ||
      (lead.last_message && lead.last_message.toLowerCase().includes(searchLower))
    );
  });

  console.log('🎯 Leads filtrados sendo passados para a tabela:', {
    projectId: activeProject?.id,
    projectName: activeProject?.name,
    totalLeads: filteredLeads.length,
    leads: filteredLeads.map(lead => ({
      name: lead.name,
      client_id: lead.client_id,
      last_message: lead.last_message,
      type: typeof lead.last_message
    }))
  });

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Leads</h1>
            <p className="text-muted-foreground">
              Gerencie todos os seus leads de WhatsApp
              {activeProject && (
                <span className="ml-2 text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  Projeto: {activeProject.name}
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleOpenAddDialog}>
              <Plus className="mr-2 h-4 w-4" /> Novo Lead
            </Button>
          </div>
        </div>

        <PendingLeadConverter />

        <div className="flex items-center">
          <Input
            placeholder="Buscar leads por nome, telefone, campanha, status ou mensagem..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-lg"
          />
        </div>

        <LeadsTable
          leads={filteredLeads}
          isLoading={isLoading}
          onView={handleOpenViewDialog}
          onDelete={handleDeleteLead}
          onOpenWhatsApp={openWhatsApp}
        />

        <LeadDialog
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          mode={dialogMode}
          currentLead={currentLead}
          campaigns={campaigns}
          onSave={handleSaveLead}
          onInputChange={handleInputChange}
          onPhoneChange={handlePhoneChange}
          onSelectChange={handleSelectChange}
        />

        <LeadDetailDialog
          isOpen={isDetailDialogOpen}
          onClose={() => setIsDetailDialogOpen(false)}
          lead={selectedLead}
          onSave={handleSaveFromDetailDialog}
          onOpenWhatsApp={openWhatsApp}
        />
      </div>
    </MainLayout>
  );
};

export default Leads;
