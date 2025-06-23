
import { toast } from 'sonner';
import { Campaign } from '@/types';
import { useEnhancedPixelTracking } from './useEnhancedPixelTracking';
import { collectUrlParameters } from '@/lib/dataCollection';
import { saveTrackingData } from '@/services/sessionTrackingService';
import { supabase } from '@/integrations/supabase/client';

type UTMVars = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  fbclid?: string;
  gclid?: string;
  site_source_name?: string;
  adset_id?: string;
  campaign_id?: string;
  ad_id?: string;
  placement?: string;
  facebook_ad_id?: string;
  facebook_adset_id?: string;
  facebook_campaign_id?: string;
};

export const useDirectWhatsAppRedirect = (
  campaignId: string | null,
  pixelInitialized: boolean
) => {
  const handleDirectWhatsAppRedirect = async (
    campaignData: Campaign,
    options?: {
      phone?: string;
      name?: string;
      utms?: UTMVars;
    }
  ) => {
    try {
      console.log('🔄 [DIRECT WHATSAPP] Processing direct WhatsApp redirect for campaign:', campaignData.name, {
        campaignId,
        phone: options?.phone,
        name: options?.name,
        utms: options?.utms
      });

      // Inicializa tracking avançado se necessário
      if (campaignData.event_type && pixelInitialized) {
        try {
          const { trackEnhancedCustomEvent } = useEnhancedPixelTracking(campaignData);

          console.log('📊 [DIRECT WHATSAPP] Tracking enhanced event before redirect:', campaignData.event_type);

          await trackEnhancedCustomEvent(campaignData.event_type, {
            redirect_type: 'direct_whatsapp',
            campaign_name: campaignData.name
          });
          console.log('✅ [DIRECT WHATSAPP] Enhanced event tracked successfully');
        } catch (trackingError) {
          console.warn('⚠️ [DIRECT WHATSAPP] Enhanced tracking failed, continuing with redirect:', trackingError);
        }
      }

      // ✅ COLETA UTMs DA URL ATUAL SE NÃO FORAM FORNECIDOS
      const currentUtms = options?.utms || collectUrlParameters();
      console.log('🌐 [DIRECT WHATSAPP] UTMs para redirecionamento direto:', currentUtms);

      // 🆕 SALVAR DADOS DE TRACKING COM IDENTIFICADORES ÚNICOS
      try {
        const trackingResult = await saveTrackingData(currentUtms, campaignId!);
        if (trackingResult.success) {
          console.log('✅ [DIRECT WHATSAPP] Dados de tracking salvos:', {
            session_id: trackingResult.session_id,
            browser_fingerprint: trackingResult.browser_fingerprint,
            campaign_id: campaignId
          });
        }
      } catch (trackingError) {
        console.warn('⚠️ [DIRECT WHATSAPP] Erro ao salvar tracking data, continuando...:', trackingError);
      }

      // 🆕 CRIAR PENDING_LEAD DIRETAMENTE (SEM TELEFONE AINDA)
      try {
        console.log('📋 [DIRECT WHATSAPP] Criando pending_lead para modo direto...');
        
        const pendingLeadData = {
          campaign_id: campaignId!,
          campaign_name: campaignData.name || 'Redirecionamento Direto',
          name: options?.name || 'Visitante',
          phone: 'PENDING_CONTACT', // Placeholder até receber mensagem no WhatsApp
          status: 'pending',
          utm_source: currentUtms.utm_source || '',
          utm_medium: currentUtms.utm_medium || '',
          utm_campaign: currentUtms.utm_campaign || '',
          utm_content: currentUtms.utm_content || (currentUtms.gclid ? `gclid=${currentUtms.gclid}` : '') || '',
          utm_term: currentUtms.utm_term || (currentUtms.fbclid ? `fbclid=${currentUtms.fbclid}` : '') || '',
          // 🆕 DADOS EXPANDIDOS UTM E FACEBOOK
          webhook_data: {
            site_source_name: currentUtms.site_source_name,
            adset_name: currentUtms.adset_id,
            campaign_name: currentUtms.campaign_id,
            ad_name: currentUtms.ad_id,
            placement: currentUtms.placement,
            gclid: currentUtms.gclid,
            fbclid: currentUtms.fbclid,
            facebook_ad_id: currentUtms.facebook_ad_id,
            facebook_adset_id: currentUtms.facebook_adset_id,
            facebook_campaign_id: currentUtms.facebook_campaign_id
          }
        };

        console.log('💾 [DIRECT WHATSAPP] Dados do pending_lead:', pendingLeadData);

        const { error: pendingError } = await supabase
          .from('pending_leads')
          .insert(pendingLeadData);

        if (pendingError) {
          console.error('❌ [DIRECT WHATSAPP] Erro ao criar pending_lead:', pendingError);
          throw pendingError;
        }

        console.log('✅ [DIRECT WHATSAPP] Pending_lead criado com sucesso');

      } catch (trackError) {
        console.error('❌ [DIRECT WHATSAPP] Erro ao processar pending_lead:', trackError);
        // Continuar mesmo com erro para não bloquear o redirecionamento
      }

      // Pega o número de destino do WhatsApp
      const targetPhone = campaignData.whatsapp_number;

      if (!targetPhone) {
        console.warn('⚠️ [DIRECT WHATSAPP] Número de WhatsApp não configurado para esta campanha');
        toast.error('Número de WhatsApp não configurado para esta campanha');
        throw new Error('Número de WhatsApp não configurado');
      }

      // Monta a URL do WhatsApp com mensagem personalizada
      let whatsappUrl = `https://wa.me/${targetPhone}`;

      if (campaignData.custom_message) {
        const encodedMessage = encodeURIComponent(campaignData.custom_message);
        whatsappUrl += `?text=${encodedMessage}`;
      }

      console.log('↗️ [DIRECT WHATSAPP] Redirecting to WhatsApp with URL:', whatsappUrl);

      toast.success('Redirecionando para o WhatsApp...');
      
      // Garantir que o redirecionamento aconteça
      setTimeout(() => {
        window.location.href = whatsappUrl;
      }, 1000);
      
      console.log('✅ [DIRECT WHATSAPP] WhatsApp redirect initiated successfully');

    } catch (err) {
      console.error('❌ [DIRECT WHATSAPP] Error in direct WhatsApp redirect:', err);
      toast.error('Erro ao processar redirecionamento direto');
      
      // Tentar redirecionamento mesmo com erro
      if (campaignData.whatsapp_number) {
        setTimeout(() => {
          window.location.href = `https://wa.me/${campaignData.whatsapp_number}`;
        }, 1000);
      }
    }
  };

  return {
    handleDirectWhatsAppRedirect
  };
};
