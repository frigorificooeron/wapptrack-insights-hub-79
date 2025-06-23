
import { trackRedirect } from '@/services/trackingService';
import { toast } from 'sonner';
import { sendWebhookData } from '@/services/webhookService';
import { Lead } from '@/types';
import { Campaign } from '@/types';
import { useEnhancedPixelTracking } from './useEnhancedPixelTracking';
import { collectUrlParameters } from '@/lib/dataCollection';
import { supabase } from '@/integrations/supabase/client';

export const useFormSubmission = (
  campaignId: string | null,
  campaign: Campaign | null,
  pixelInitialized: boolean
) => {
  const { trackEnhancedLead } = useEnhancedPixelTracking(campaign);

  const updateLeadWhatsAppStatus = async (leadId: string, delivered: boolean) => {
    try {
      const status: Lead['status'] = delivered ? 'lead' : 'to_recover';
      const updateData: Partial<Lead> = {
        status,
        whatsapp_delivery_attempts: delivered ? 1 : 1,
        last_whatsapp_attempt: new Date().toISOString()
      };
      
      // Importar dinamicamente para evitar dependência circular
      const { updateLead } = await import('@/services/leadService');
      await updateLead(leadId, updateData);
      console.log(`✅ [FORM SUBMISSION] Lead status updated to: ${status}`);
    } catch (error) {
      console.error('❌ [FORM SUBMISSION] Error updating lead WhatsApp status:', error);
    }
  };

  const handleFormSubmit = async (phone: string, name: string, email?: string) => {
    if (!campaignId) {
      console.error('❌ [FORM SUBMISSION] ID da campanha não encontrado');
      throw new Error('ID da campanha não encontrado');
    }

    console.log('📝 [FORM SUBMISSION] Processing form submission...', {
      campaignId,
      phone,
      name,
      campaign: campaign?.name
    });

    // ✅ VERIFICAR AUTENTICAÇÃO DO USUÁRIO
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('❌ [FORM SUBMISSION] Usuário não autenticado:', authError);
      throw new Error('Usuário não autenticado');
    }

    console.log('✅ [FORM SUBMISSION] Usuário autenticado:', user.id);

    // Track enhanced lead event BEFORE processing
    if (campaign && trackEnhancedLead) {
      try {
        console.log('📊 [FORM SUBMISSION] Tracking enhanced lead event...');
        await trackEnhancedLead({
          name,
          phone,
          email,
          value: 100
        });
        console.log('✅ [FORM SUBMISSION] Enhanced lead tracking completed');
      } catch (trackingError) {
        console.warn('⚠️ [FORM SUBMISSION] Enhanced lead tracking failed, continuing with form processing:', trackingError);
      }
    }

    // Send data via external webhook if configured
    try {
      const webhookConfig = localStorage.getItem('webhook_config');
      if (webhookConfig) {
        const config = JSON.parse(webhookConfig);
        if (config.webhook_url) {
          const webhookData = {
            campaign_id: campaignId,
            campaign_name: campaign?.name,
            lead_name: name,
            lead_phone: phone,
            lead_email: email,
            timestamp: new Date().toISOString(),
            event_type: campaign?.event_type,
            user_id: user.id
          };
          
          await sendWebhookData(config.webhook_url, webhookData);
          console.log('✅ [FORM SUBMISSION] Data sent via external webhook successfully');
        }
      }
    } catch (error) {
      console.error('❌ [FORM SUBMISSION] Error sending data via external webhook:', error);
    }

    // 🎯 COLETA UTMs E PARÂMETROS EXPANDIDOS ATUALIZADOS
    const utms = collectUrlParameters();
    console.log('🌐 [FORM SUBMISSION] UTMs e parâmetros expandidos obtidos da URL:', {
      utm_source: utms.utm_source,
      utm_medium: utms.utm_medium,
      utm_campaign: utms.utm_campaign,
      utm_content: utms.utm_content,
      utm_term: utms.utm_term,
      site_source_name: utms.site_source_name,
      ad_id: utms.ad_id,
      adset_id: utms.adset_id,
      campaign_id: utms.campaign_id,
      placement: utms.placement,
      gclid: utms.gclid,
      fbclid: utms.fbclid,
      facebook_ad_id: utms.facebook_ad_id,
      facebook_adset_id: utms.facebook_adset_id,
      facebook_campaign_id: utms.facebook_campaign_id
    });

    console.log('📱 [FORM SUBMISSION] Processando formulário via trackRedirect...');
    
    try {
      const result = await trackRedirect(
        campaignId, 
        phone, 
        name, 
        campaign?.event_type,
        {
          utm_source: utms.utm_source,
          utm_medium: utms.utm_medium,
          utm_campaign: utms.utm_campaign,
          utm_content: utms.utm_content,
          utm_term: utms.utm_term,
          gclid: utms.gclid,
          fbclid: utms.fbclid,
          site_source_name: utms.site_source_name,
          adset_name: utms.adset_id,
          campaign_name: utms.campaign_id,
          ad_name: utms.ad_id,
          placement: utms.placement
        }
      );
      
      console.log('✅ [FORM SUBMISSION] trackRedirect executado com sucesso:', result);
      
      // Get target WhatsApp number
      const targetPhone = result.targetPhone || campaign?.whatsapp_number;
      
      if (!targetPhone) {
        console.warn('⚠️ [FORM SUBMISSION] Número de WhatsApp não configurado para esta campanha');
        toast.error('Número de WhatsApp não configurado para esta campanha');
        throw new Error('Número de WhatsApp não configurado');
      }
      
      // Build WhatsApp URL with custom message
      let whatsappUrl = `https://wa.me/${targetPhone}`;
      
      if (campaign?.custom_message) {
        let message = campaign.custom_message;
        if (name) {
          message = message.replace(/\{nome\}/gi, name);
        }
        message = message.replace(/\{telefone\}/gi, phone);
        
        const encodedMessage = encodeURIComponent(message);
        whatsappUrl += `?text=${encodedMessage}`;
      }
      
      console.log('↗️ [FORM SUBMISSION] Redirecting to WhatsApp with URL:', whatsappUrl);
      
      toast.success('Lead salvo! Redirecionando para o WhatsApp...');
      
      // Garantir que o redirecionamento aconteça
      setTimeout(() => {
        window.location.href = whatsappUrl;
      }, 1500);
      
      console.log('✅ [FORM SUBMISSION] WhatsApp redirect initiated');
    } catch (error) {
      console.error('❌ [FORM SUBMISSION] Error in trackRedirect or WhatsApp redirect:', error);
      toast.error('Erro ao processar redirecionamento. Tentando novamente...');
      
      // Fallback: tentar redirecionamento direto
      if (campaign?.whatsapp_number) {
        setTimeout(() => {
          window.location.href = `https://wa.me/${campaign.whatsapp_number}`;
        }, 1000);
      }
      
      throw new Error('Erro ao processar redirecionamento');
    }
  };

  return {
    handleFormSubmit,
    updateLeadWhatsAppStatus
  };
};
