import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { evolutionService } from '@/services/evolutionService';

export interface WhatsAppInstance {
  id: string;
  user_id: string;
  instance_name: string;
  description?: string;
  base_url: string;
  status: 'connected' | 'disconnected' | 'connecting' | 'error';
  webhook_url?: string;
  created_at: string;
  updated_at: string;
}

export const useWhatsAppInstances = () => {
  const [instances, setInstances] = useState<WhatsAppInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const loadInstances = async () => {
    try {
      const { data, error } = await supabase
        .from('whatsapp_instances')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInstances((data || []) as WhatsAppInstance[]);
    } catch (error: any) {
      console.error('Error loading instances:', error);
      toast.error('Erro ao carregar instâncias');
    } finally {
      setLoading(false);
    }
  };

  const createInstance = async (instanceName: string, description?: string) => {
    setCreating(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) throw new Error('Usuário não autenticado');

      // First create instance in Evolution API
      const evolutionResult = await evolutionService.createEvolutionInstance(
        instanceName,
        `https://bwicygxyhkdgrypqrijo.supabase.co/functions/v1/evolution-webhook`
      );

      if (!evolutionResult.success) {
        throw new Error(evolutionResult.error || 'Erro ao criar instância na Evolution API');
      }

      // Then create in our database
      const { data, error } = await supabase
        .from('whatsapp_instances')
        .insert({
          instance_name: instanceName,
          description,
          user_id: authData.user.id,
          webhook_url: `https://bwicygxyhkdgrypqrijo.supabase.co/functions/v1/evolution-webhook`
        })
        .select()
        .single();

      if (error) throw error;

      setInstances(prev => [data as WhatsAppInstance, ...prev]);
      toast.success('Instância criada com sucesso!');
      return data;
    } catch (error: any) {
      console.error('Error creating instance:', error);
      toast.error('Erro ao criar instância: ' + error.message);
      throw error;
    } finally {
      setCreating(false);
    }
  };

  const updateInstanceStatus = async (instanceId: string, status: WhatsAppInstance['status']) => {
    try {
      const { error } = await supabase
        .from('whatsapp_instances')
        .update({ status })
        .eq('id', instanceId);

      if (error) throw error;

      setInstances(prev =>
        prev.map(instance =>
          instance.id === instanceId ? { ...instance, status } : instance
        )
      );
    } catch (error: any) {
      console.error('Error updating instance status:', error);
      toast.error('Erro ao atualizar status da instância');
    }
  };

  const deleteInstance = async (instanceId: string) => {
    try {
      const { error } = await supabase
        .from('whatsapp_instances')
        .delete()
        .eq('id', instanceId);

      if (error) throw error;

      setInstances(prev => prev.filter(instance => instance.id !== instanceId));
      toast.success('Instância removida com sucesso!');
    } catch (error: any) {
      console.error('Error deleting instance:', error);
      toast.error('Erro ao remover instância');
    }
  };

  useEffect(() => {
    loadInstances();
  }, []);

  return {
    instances,
    loading,
    creating,
    createInstance,
    updateInstanceStatus,
    deleteInstance,
    refetch: loadInstances
  };
};