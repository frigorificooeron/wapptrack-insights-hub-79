
import { toast } from 'sonner';
import { Campaign } from '@/types';
import { useEnhancedPixelTracking } from './useEnhancedPixelTracking';
import { collectUrlParameters } from '@/lib/dataCollection';
import { saveTrackingData } from '@/services/sessionTrackingService';
import { supabase } from '@/integrations/supabase/client';
import { useDeviceData } from './useDeviceData';

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
  const { captureAndSave } = useDeviceData();

  const handleDirectWhatsAppRedirect = async (
    campaignData: Campaign,
    options?: {
      phone?: string;
      name?: string;
      utms?: UTMVars;
    }
  ) => {
    try {
      console.log('🔄 [DIRECT WHATSAPP] Iniciando redirecionamento direto para campanha:', campaignData.name, {
        campaignId,
        phone: options?.phone,
        name: options?.name,
        utms: options?.utms
      });

      // Verificar se o número do WhatsApp está configurado
      if (!campaignData.whatsapp_number) {
        console.error('❌ [DIRECT WHATSAPP] Número de WhatsApp não configurado para esta campanha');
        toast.error('Número de WhatsApp não configurado para esta campanha');
        return;
      }

      // ✅ COLETA UTMs DA URL ATUAL SE NÃO FORAM FORNECIDOS
      const currentUtms = options?.utms || collectUrlParameters();
      console.log('🌐 [DIRECT WHATSAPP] UTMs coletados:', currentUtms);

      // 🆕 CAPTURAR E SALVAR DADOS DO DISPOSITIVO COM ID ÚNICO
      let deviceSessionId = null;
      try {
        console.log('📱 [DIRECT WHATSAPP] Capturando dados do dispositivo...');
        const deviceData = await captureAndSave();
        // Criar um identificador único baseado nos dados do dispositivo
        deviceSessionId = `${deviceData?.device_type || 'unknown'}_${deviceData?.browser || 'unknown'}_${Date.now()}`;
        console.log('✅ [DIRECT WHATSAPP] Dados do dispositivo capturados com ID:', deviceSessionId);
      } catch (deviceError) {
        console.warn('⚠️ [DIRECT WHATSAPP] Erro ao capturar dados do dispositivo:', deviceError);
        deviceSessionId = `fallback_${Date.now()}`;
      }

      // 🆕 CRIAR PENDING_LEAD COM IDENTIFICADORES DE CORRELAÇÃO EXPANDIDOS
      try {
        console.log('📋 [DIRECT WHATSAPP] Criando pending_lead melhorado para modo direto...');
        
        const pendingLeadData = {
          campaign_id: campaignId!,
          campaign_name: campaignData.name || 'Redirecionamento Direto',
          name: options?.name || 'Visitante',
          phone: 'PENDING_CONTACT', // Placeholder até receber mensagem no WhatsApp
          status: 'pending',
          utm_source: currentUtms.utm_source || '',
          utm_medium: currentUtms.utm_medium || '',
          utm_campaign: currentUtms.utm_campaign || '',
          utm_content: currentUtms.utm_content || '',
          utm_term: currentUtms.utm_term || '',
          webhook_data: {
            // 🎯 DADOS EXPANDIDOS PARA CORRELAÇÃO
            site_source_name: currentUtms.site_source_name,
            adset_name: currentUtms.adset_id,
            campaign_name: currentUtms.campaign_id,
            ad_name: currentUtms.ad_id,
            placement: currentUtms.placement,
            gclid: currentUtms.gclid,
            fbclid: currentUtms.fbclid,
            facebook_ad_id: currentUtms.facebook_ad_id,
            facebook_adset_id: currentUtms.facebook_adset_id,
            facebook_campaign_id: currentUtms.facebook_campaign_id,
            // 🆕 IDENTIFICADORES DE SESSÃO PARA CORRELAÇÃO
            device_session_id: deviceSessionId,
            redirect_timestamp: new Date().toISOString(),
            user_agent: navigator.userAgent,
            screen_resolution: `${screen.width}x${screen.height}`,
            language: navigator.language,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            // 🆕 DADOS TÉCNICOS PARA MATCHING
            correlation_window: 300000, // 5 minutos em ms
            redirect_type: 'direct_whatsapp',
            campaign_click_id: `click_${campaignId}_${Date.now()}`
          }
        };

        console.log('💾 [DIRECT WHATSAPP] Dados do pending_lead expandido:', {
          campaign_id: pendingLeadData.campaign_id,
          device_session_id: deviceSessionId,
          correlation_data: pendingLeadData.webhook_data
        });

        const { data, error: pendingError } = await supabase
          .from('pending_leads')
          .insert(pendingLeadData)
          .select()
          .single();

        if (pendingError) {
          console.error('❌ [DIRECT WHATSAPP] Erro ao criar pending_lead:', pendingError);
          throw pendingError;
        }

        console.log('✅ [DIRECT WHATSAPP] Pending_lead expandido criado com sucesso:', data.id);

      } catch (trackError) {
        console.error('❌ [DIRECT WHATSAPP] Erro ao processar pending_lead expandido:', trackError);
        // Continuar mesmo com erro para não bloquear o redirecionamento
      }

      // 🆕 SALVAR DADOS DE TRACKING COM IDENTIFICADORES EXPANDIDOS
      try {
        const enhancedTrackingData = {
          ...currentUtms,
          device_session_id: deviceSessionId,
          campaign_click_id: `click_${campaignId}_${Date.now()}`,
          redirect_timestamp: new Date().toISOString(),
          correlation_window: 300000, // 5 minutos
          tracking_method: 'direct_whatsapp_enhanced'
        };

        const trackingResult = await saveTrackingData(enhancedTrackingData, campaignId!);
        if (trackingResult.success) {
          console.log('✅ [DIRECT WHATSAPP] Dados de tracking expandidos salvos:', {
            session_id: trackingResult.session_id,
            browser_fingerprint: trackingResult.browser_fingerprint,
            device_session_id: deviceSessionId,
            campaign_id: campaignId
          });
        }
      } catch (trackingError) {
        console.warn('⚠️ [DIRECT WHATSAPP] Erro ao salvar tracking expandido, continuando...:', trackingError);
      }

      // Tracking avançado se necessário
      if (campaignData.event_type && pixelInitialized) {
        try {
          const { trackEnhancedCustomEvent } = useEnhancedPixelTracking(campaignData);
          console.log('📊 [DIRECT WHATSAPP] Executando tracking avançado:', campaignData.event_type);
          await trackEnhancedCustomEvent(campaignData.event_type, {
            redirect_type: 'direct_whatsapp',
            campaign_name: campaignData.name,
            device_session_id: deviceSessionId
          });
          console.log('✅ [DIRECT WHATSAPP] Tracking avançado executado com sucesso');
        } catch (trackingError) {
          console.warn('⚠️ [DIRECT WHATSAPP] Tracking avançado falhou, continuando com redirecionamento:', trackingError);
        }
      }

      // Monta a URL do WhatsApp com mensagem personalizada
      let whatsappUrl = `https://wa.me/${campaignData.whatsapp_number}`;

      if (campaignData.custom_message) {
        const encodedMessage = encodeURIComponent(campaignData.custom_message);
        whatsappUrl += `?text=${encodedMessage}`;
      }

      console.log('↗️ [DIRECT WHATSAPP] Redirecionando para WhatsApp:', whatsappUrl);

      toast.success('Redirecionando para o WhatsApp...');
      
      // Garantir que o redirecionamento aconteça
      window.location.href = whatsappUrl;
      
      console.log('✅ [DIRECT WHATSAPP] Redirecionamento WhatsApp iniciado com sucesso');

    } catch (err) {
      console.error('❌ [DIRECT WHATSAPP] Erro no redirecionamento direto:', err);
      toast.error('Erro ao processar redirecionamento direto');
      
      // Tentar redirecionamento mesmo com erro
      if (campaignData.whatsapp_number) {
        window.location.href = `https://wa.me/${campaignData.whatsapp_number}`;
      }
    }
  };

  return {
    handleDirectWhatsAppRedirect
  };
};
