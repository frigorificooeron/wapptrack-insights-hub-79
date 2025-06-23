
import { supabase } from "../integrations/supabase/client";
import { getDeviceDataByPhone } from "./deviceDataService";

/**
 * Função principal para rastrear redirecionamentos e salvar leads - CORRIGIDA
 */
export const trackRedirect = async (
  campaignId: string, 
  phone: string, 
  name?: string,
  eventType?: string,
  utms?: {
    utm_source?: string
    utm_medium?: string
    utm_campaign?: string
    utm_content?: string
    utm_term?: string
    gclid?: string
    fbclid?: string
    site_source_name?: string
    adset_name?: string
    campaign_name?: string
    ad_name?: string
    placement?: string
  }
): Promise<{targetPhone?: string}> => {
  try {
    console.log('➡️ [TRACK REDIRECT] Iniciado com parâmetros expandidos:', {
      campaignId,
      phone,
      name,
      eventType,
      utms
    });

    // Busca a campanha por ID
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    // Campanha não encontrada -> fallback default
    if (campaignError || !campaign) {
      console.log(`❌ [TRACK REDIRECT] Campaign with ID ${campaignId} not found. Creating default lead.`);
      return { targetPhone: '5585998372658' };
    }

    console.log('✅ [TRACK REDIRECT] Campanha encontrada:', {
      id: campaign.id,
      name: campaign.name,
      redirect_type: campaign.redirect_type,
      user_id: campaign.user_id
    });

    const type = eventType || campaign.redirect_type || 'lead';

    // Para campanhas de redirecionamento WhatsApp direto (NÃO DEVERIA CHEGAR AQUI)
    if (campaign.redirect_type === 'whatsapp') {
      console.log(`🚦 [TRACK REDIRECT] Campanha de redirecionamento WhatsApp direto - NÃO DEVERIA CHEGAR AQUI`, {
        id: campaign.id,
        name: campaign.name,
        utms
      });
      
      return { targetPhone: campaign.whatsapp_number };
    }

    // Para campanhas de formulário, criar lead imediatamente
    if ((type === 'lead' || type === 'contact') && phone) {
      console.log('📝 [TRACK REDIRECT] Processando campanha de formulário...');
      
      // ✅ USAR USER_ID DA CAMPANHA (NÃO PRECISA DE AUTH AQUI)
      const campaignUserId = campaign.user_id;
      if (!campaignUserId) {
        console.error('❌ [TRACK REDIRECT] user_id não encontrado na campanha');
        return { targetPhone: campaign.whatsapp_number };
      }

      console.log('✅ [TRACK REDIRECT] user_id da campanha:', campaignUserId);
      
      // Buscar dados do dispositivo para enriquecer o lead
      const deviceData = await getDeviceDataByPhone(phone);
      
      const leadData = {
        name: name || 'Lead via Tracking',
        phone,
        campaign: campaign.name,
        campaign_id: campaignId,
        status: 'new' as const, // 🆕 Status inicial "new" até receber mensagem
        user_id: campaignUserId, // ✅ USAR USER_ID DA CAMPANHA
        utm_source: utms?.utm_source || '',
        utm_medium: utms?.utm_medium || '',
        utm_campaign: utms?.utm_campaign || '',
        utm_content: utms?.utm_content || (utms?.gclid ? `gclid=${utms.gclid}` : '') || '',
        utm_term: utms?.utm_term || (utms?.fbclid ? `fbclid=${utms.fbclid}` : '') || '',
        // 🆕 NOVOS CAMPOS UTM E DISPOSITIVO EXPANDIDOS
        ad_account: utms?.site_source_name || '',
        ad_set_name: utms?.adset_name || '',
        ad_name: utms?.ad_name || '',
        tracking_method: utms?.placement || 'form',
        // Incluir dados do dispositivo se disponíveis
        ...(deviceData && {
          location: deviceData.location,
          ip_address: deviceData.ip_address,
          browser: deviceData.browser,
          os: deviceData.os,
          device_type: deviceData.device_type,
          device_model: deviceData.device_model,
          country: deviceData.country,
          city: deviceData.city,
          screen_resolution: deviceData.screen_resolution,
          timezone: deviceData.timezone,
          language: deviceData.language,
          facebook_ad_id: deviceData.facebook_ad_id,
          facebook_adset_id: deviceData.facebook_adset_id,
          facebook_campaign_id: deviceData.facebook_campaign_id
        })
      };
      
      console.log('📝 [TRACK REDIRECT] Criando lead com dados expandidos:', {
        name: leadData.name,
        phone: leadData.phone,
        user_id: leadData.user_id,
        campaign_id: leadData.campaign_id,
        utm_source: leadData.utm_source,
        ad_account: leadData.ad_account,
        ad_set_name: leadData.ad_set_name,
        ad_name: leadData.ad_name,
        facebook_ad_id: leadData.facebook_ad_id,
        tem_dados_dispositivo: !!deviceData
      });

      const { error: leadError } = await supabase
        .from('leads')
        .insert(leadData);

      if (leadError) {
        console.error('❌ [TRACK REDIRECT] Erro ao criar lead:', leadError);
      } else {
        console.log('✅ [TRACK REDIRECT] Lead criado com sucesso');
      }
    }

    return { targetPhone: campaign.whatsapp_number };
  } catch (error) {
    console.error('❌ [TRACK REDIRECT] Erro geral:', error);
    return { targetPhone: '5585998372658' };
  }
};
