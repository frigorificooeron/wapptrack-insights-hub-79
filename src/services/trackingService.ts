
import { supabase } from "../integrations/supabase/client";
import { getDeviceDataByPhone } from "./deviceDataService";

/**
 * Função principal para rastrear redirecionamentos e salvar leads
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
    console.log('➡️ [TRACK REDIRECT] Iniciado com parâmetros:', {
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
      console.log(`❌ Campaign with ID ${campaignId} not found. Creating default lead.`);
      return { targetPhone: '5585998372658' };
    }

    const type = eventType || campaign.redirect_type || 'lead';

    // Para campanhas de redirecionamento WhatsApp direto
    if (campaign.redirect_type === 'whatsapp') {
      console.log(`🚦 Campanha de redirecionamento WhatsApp direto`, {
        id: campaign.id,
        name: campaign.name,
        utms
      });
      
      // 🆕 MODO DIRETO: Criar pending_lead que será convertido quando receber mensagem
      await createPendingLead(campaignId, phone, name || 'Visitante', campaign.name, utms);
      
      return { targetPhone: campaign.whatsapp_number };
    }

    // Para campanhas de formulário, criar lead imediatamente
    if ((type === 'lead' || type === 'contact') && phone) {
      console.log('📝 [FORMULÁRIO] Processando campanha de formulário...');
      
      // Get current user ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('❌ [FORMULÁRIO] Usuário não autenticado');
        return { targetPhone: campaign.whatsapp_number };
      }
      
      // Buscar dados do dispositivo para enriquecer o lead
      const deviceData = await getDeviceDataByPhone(phone);
      
      const leadData = {
        name: name || 'Lead via Tracking',
        phone,
        campaign: campaign.name,
        status: 'new' as const, // 🆕 Status inicial "new" até receber mensagem
        user_id: user.id,
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
      
      console.log('📝 [FORMULÁRIO] Criando lead:', leadData);

      const { error: leadError } = await supabase
        .from('leads')
        .insert(leadData);

      if (leadError) {
        console.error('❌ [FORMULÁRIO] Erro ao criar lead:', leadError);
      } else {
        console.log('✅ [FORMULÁRIO] Lead criado com sucesso');
      }
    }

    return { targetPhone: campaign.whatsapp_number };
  } catch (error) {
    console.error('❌ [TRACK REDIRECT] Erro geral:', error);
    return { targetPhone: '5585998372658' };
  }
};

/**
 * 🆕 Criar pending lead para modo direto
 */
const createPendingLead = async (
  campaignId: string,
  phone: string,
  name: string,
  campaignName: string,
  utms?: any
) => {
  try {
    const pendingLeadData = {
      campaign_id: campaignId,
      campaign_name: campaignName,
      name,
      phone,
      status: 'pending',
      utm_source: utms?.utm_source || '',
      utm_medium: utms?.utm_medium || '',
      utm_campaign: utms?.utm_campaign || '',
      utm_content: utms?.utm_content || (utms?.gclid ? `gclid=${utms.gclid}` : '') || '',
      utm_term: utms?.utm_term || (utms?.fbclid ? `fbclid=${utms.fbclid}` : '') || '',
      // 🆕 DADOS EXPANDIDOS UTM
      webhook_data: {
        site_source_name: utms?.site_source_name,
        adset_name: utms?.adset_name,
        campaign_name: utms?.campaign_name,
        ad_name: utms?.ad_name,
        placement: utms?.placement,
        gclid: utms?.gclid,
        fbclid: utms?.fbclid
      }
    };

    console.log('📋 [PENDING LEAD] Criando pending lead para modo direto:', pendingLeadData);

    const { error } = await supabase
      .from('pending_leads')
      .insert(pendingLeadData);

    if (error) {
      console.error('❌ [PENDING LEAD] Erro ao criar pending lead:', error);
    } else {
      console.log('✅ [PENDING LEAD] Pending lead criado com sucesso');
    }
  } catch (error) {
    console.error('❌ [PENDING LEAD] Erro geral:', error);
  }
};
