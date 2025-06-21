
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const usePendingLeadConverter = () => {
  const [isConverting, setIsConverting] = useState(false);

  const convertPendingLead = async (pendingLeadId: string) => {
    setIsConverting(true);
    try {
      // Get pending lead data
      const { data: pendingLead, error: fetchError } = await supabase
        .from('pending_leads')
        .select('*')
        .eq('id', pendingLeadId)
        .single();

      if (fetchError || !pendingLead) {
        throw new Error('Pending lead not found');
      }

      // Convert to regular lead
      const { error: insertError } = await supabase
        .from('leads')
        .insert({
          name: pendingLead.name,
          phone: pendingLead.phone,
          campaign: pendingLead.campaign_name || 'Unknown',
          campaign_id: pendingLead.campaign_id,
          status: 'new',
          utm_source: pendingLead.utm_source || '',
          utm_medium: pendingLead.utm_medium || '',
          utm_campaign: pendingLead.utm_campaign || '',
          utm_content: pendingLead.utm_content || '',
          utm_term: pendingLead.utm_term || ''
        });

      if (insertError) {
        throw insertError;
      }

      // Delete pending lead
      const { error: deleteError } = await supabase
        .from('pending_leads')
        .delete()
        .eq('id', pendingLeadId);

      if (deleteError) {
        throw deleteError;
      }

      toast.success('Lead convertido com sucesso!');
      return true;
    } catch (error: any) {
      console.error('Error converting pending lead:', error);
      toast.error(`Erro ao converter lead: ${error.message}`);
      return false;
    } finally {
      setIsConverting(false);
    }
  };

  return {
    convertPendingLead,
    isConverting
  };
};
