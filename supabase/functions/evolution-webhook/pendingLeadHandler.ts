
import { getDeviceDataByPhone } from './deviceDataHandler.ts';

export const handlePendingLeadConversion = async (supabase: any, phone: string, messageText: string, messageId: string, status: string, contactName?: string) => {
  console.log(`🔄 [PENDING LEAD] handlePendingLeadConversion - Verificando pending_lead para: ${phone}`);
  
  try {
    // Buscar pending_lead para este telefone (incluindo PENDING_CONTACT)
    const { data: pendingLeads, error: pendingError } = await supabase
      .from('pending_leads')
      .select('*')
      .or(`phone.eq.${phone},phone.eq.PENDING_CONTACT`)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1);

    if (pendingError) {
      console.error('❌ [PENDING LEAD] Erro ao buscar pending_leads:', pendingError);
      return;
    }

    if (!pendingLeads || pendingLeads.length === 0) {
      console.log('❌ [PENDING LEAD] Nenhum pending_lead encontrado para:', phone);
      return;
    }

    const pendingLead = pendingLeads[0];
    console.log('✅ [PENDING LEAD] Pending lead encontrado:', {
      id: pendingLead.id,
      name: pendingLead.name,
      campaign_name: pendingLead.campaign_name,
      campaign_id: pendingLead.campaign_id,
      phone_original: pendingLead.phone
    });

    // ✅ BUSCAR USER_ID DA CAMPANHA
    let campaignUserId = null;
    if (pendingLead.campaign_id) {
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .select('user_id')
        .eq('id', pendingLead.campaign_id)
        .single();

      if (campaign && !campaignError) {
        campaignUserId = campaign.user_id;
        console.log('✅ [PENDING LEAD] User ID da campanha encontrado:', campaignUserId);
      } else {
        console.log('⚠️ [PENDING LEAD] Campanha não encontrada ou erro:', campaignError);
        // 🆕 FALLBACK: usar função get_user_by_instance
        try {
          const { data: fallbackUserId, error: fallbackError } = await supabase
            .rpc('get_user_by_instance', { instance_name_param: 'default' });
          
          if (!fallbackError && fallbackUserId) {
            campaignUserId = fallbackUserId;
            console.log('✅ [PENDING LEAD] User ID obtido via fallback:', campaignUserId);
          }
        } catch (fallbackErr) {
          console.error('❌ [PENDING LEAD] Erro no fallback user_id:', fallbackErr);
        }
      }
    }

    // 📱 BUSCAR DADOS DO DISPOSITIVO
    const deviceData = await getDeviceDataByPhone(supabase, phone);

    // 🔒 PRESERVAR SEMPRE O NOME DO FORMULÁRIO (pending_lead.name)
    const finalName = (pendingLead.name && pendingLead.name !== 'Visitante') 
      ? pendingLead.name 
      : (contactName || 'Lead via WhatsApp');

    console.log('🔒 [PENDING LEAD] Nome que será usado no lead final:', {
      nomePendingLead: pendingLead.name,
      nomeContato: contactName,
      nomeFinal: finalName,
      userId: campaignUserId
    });

    // Verificar se já existe um lead para este telefone
    const { data: existingLead, error: leadCheckError } = await supabase
      .from('leads')
      .select('*')
      .eq('phone', phone)
      .limit(1);

    if (leadCheckError) {
      console.error('❌ [PENDING LEAD] Erro ao verificar lead existente:', leadCheckError);
      return;
    }

    if (existingLead && existingLead.length > 0) {
      console.log('📝 [PENDING LEAD] Lead existente encontrado, atualizando status para "lead"...');
      
      const updateData: any = {
        status: 'lead', // 🆕 ATUALIZAR STATUS PARA "LEAD" QUANDO RECEBER MENSAGEM
        last_contact_date: new Date().toISOString(),
        evolution_message_id: messageId,
        evolution_status: status,
        last_message: messageText,
        initial_message: `Primeira mensagem: ${messageText}`
      };
      
      // Adicionar dados do dispositivo se disponíveis
      if (deviceData) {
        updateData.custom_fields = {
          ...existingLead[0].custom_fields,
          device_info: deviceData
        };
      }

      const { error: updateError } = await supabase
        .from('leads')
        .update(updateData)
        .eq('id', existingLead[0].id);

      if (updateError) {
        console.error('❌ [PENDING LEAD] Erro ao atualizar lead existente:', updateError);
      } else {
        console.log('✅ [PENDING LEAD] Lead existente atualizado para status "lead" com mensagem');
      }
    } else {
      console.log('🆕 [PENDING LEAD] Criando novo lead a partir do pending_lead...');
      
      // 🆕 EXTRAIR DADOS UTM EXPANDIDOS DO WEBHOOK_DATA
      const webhookData = pendingLead.webhook_data || {};
      
      // ✅ CRIAR NOVO LEAD COM STATUS "LEAD" E DADOS EXPANDIDOS
      const newLeadData = {
        name: finalName,
        phone: phone, // ✅ USAR TELEFONE REAL DA MENSAGEM
        campaign: pendingLead.campaign_name || 'WhatsApp',
        campaign_id: pendingLead.campaign_id,
        user_id: campaignUserId,
        status: 'lead', // 🆕 STATUS "LEAD" QUANDO CRIAR A PARTIR DE MENSAGEM
        last_message: messageText,
        initial_message: `Primeira mensagem: ${messageText}`,
        first_contact_date: new Date().toISOString(),
        last_contact_date: new Date().toISOString(),
        evolution_message_id: messageId,
        evolution_status: status,
        notes: 'Lead criado automaticamente via WhatsApp',
        utm_source: pendingLead.utm_source,
        utm_medium: pendingLead.utm_medium,
        utm_campaign: pendingLead.utm_campaign,
        utm_content: pendingLead.utm_content,
        utm_term: pendingLead.utm_term,
        // 🆕 DADOS EXPANDIDOS UTM E DISPOSITIVO
        ad_account: webhookData.site_source_name || '',
        ad_set_name: webhookData.adset_name || '',
        ad_name: webhookData.ad_name || '',
        tracking_method: webhookData.placement || 'whatsapp_direct',
        // Dados do dispositivo se disponíveis
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
          facebook_ad_id: deviceData.facebook_ad_id || webhookData.facebook_ad_id,
          facebook_adset_id: deviceData.facebook_adset_id || webhookData.facebook_adset_id,
          facebook_campaign_id: deviceData.facebook_campaign_id || webhookData.facebook_campaign_id
        }),
        custom_fields: deviceData ? { 
          device_info: deviceData,
          utm_expanded: webhookData
        } : { utm_expanded: webhookData }
      };

      console.log('💾 [PENDING LEAD] Dados do novo lead (com dados expandidos):', {
        name: newLeadData.name,
        phone: newLeadData.phone,
        user_id: newLeadData.user_id,
        campaign_id: newLeadData.campaign_id,
        facebook_ad_id: newLeadData.facebook_ad_id,
        ad_account: newLeadData.ad_account,
        ad_set_name: newLeadData.ad_set_name,
        ad_name: newLeadData.ad_name
      });

      const { error: insertError } = await supabase
        .from('leads')
        .insert(newLeadData);

      if (insertError) {
        console.error('❌ [PENDING LEAD] Erro ao criar novo lead:', insertError);
      } else {
        console.log('✅ [PENDING LEAD] Novo lead criado com status "lead" e dados expandidos!');
      }
    }

    // ✅ ATUALIZAR PENDING_LEAD COM TELEFONE REAL E MARCAR COMO CONVERTIDO
    const { error: updatePendingError } = await supabase
      .from('pending_leads')
      .update({ 
        status: 'converted',
        phone: phone // ✅ ATUALIZAR COM TELEFONE REAL
      })
      .eq('id', pendingLead.id);

    if (updatePendingError) {
      console.error('❌ [PENDING LEAD] Erro ao marcar pending_lead como convertido:', updatePendingError);
    } else {
      console.log('✅ [PENDING LEAD] Pending lead marcado como convertido com telefone real');
    }

  } catch (error) {
    console.error('❌ [PENDING LEAD] Erro geral em handlePendingLeadConversion:', error);
  }
};

// ✅ FUNÇÃO ATUALIZADA PARA USAR A FUNÇÃO SUPABASE
export const convertPendingLeadToLead = async (supabase: any, pendingLead: any) => {
  console.log('🔄 [PENDING LEAD] convertPendingLeadToLead - Convertendo usando função Supabase:', pendingLead.id);
  
  try {
    // Usar a nova função Supabase para conversão segura
    const { data: result, error } = await supabase.rpc('convert_pending_lead_secure', {
      pending_lead_id: pendingLead.id
    });

    if (error) {
      console.error('❌ [PENDING LEAD] Erro ao executar função Supabase:', error);
      return false;
    }

    console.log('📋 [PENDING LEAD] Resultado da conversão:', result);

    if (result?.success) {
      console.log('✅ [PENDING LEAD] Conversão automática via função Supabase bem-sucedida');
      return true;
    } else {
      console.error('❌ [PENDING LEAD] Falha na conversão via função Supabase:', result?.error);
      return false;
    }
  } catch (error) {
    console.error('❌ [PENDING LEAD] Erro em convertPendingLeadToLead:', error);
    return false;
  }
};
