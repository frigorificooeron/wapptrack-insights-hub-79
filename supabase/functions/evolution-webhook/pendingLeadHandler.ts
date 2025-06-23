
import { getDeviceDataByPhone } from './deviceDataHandler.ts';

export const handlePendingLeadConversion = async (supabase: any, phone: string, messageText: string, messageId: string, status: string, contactName?: string) => {
  console.log(`🔄 handlePendingLeadConversion - Verificando pending_lead para: ${phone}`);
  
  try {
    // Buscar pending_lead para este telefone
    const { data: pendingLeads, error: pendingError } = await supabase
      .from('pending_leads')
      .select('*')
      .eq('phone', phone)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1);

    if (pendingError) {
      console.error('❌ Erro ao buscar pending_leads:', pendingError);
      return;
    }

    if (!pendingLeads || pendingLeads.length === 0) {
      console.log('❌ Nenhum pending_lead encontrado para:', phone);
      return;
    }

    const pendingLead = pendingLeads[0];
    console.log('✅ Pending lead encontrado:', {
      id: pendingLead.id,
      name: pendingLead.name,
      campaign_name: pendingLead.campaign_name,
      campaign_id: pendingLead.campaign_id
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
        console.log('✅ User ID da campanha encontrado:', campaignUserId);
      } else {
        console.log('⚠️ Campanha não encontrada ou erro:', campaignError);
      }
    }

    // 📱 BUSCAR DADOS DO DISPOSITIVO
    const deviceData = await getDeviceDataByPhone(supabase, phone);

    // 🔒 PRESERVAR SEMPRE O NOME DO FORMULÁRIO (pending_lead.name)
    const finalName = (pendingLead.name && pendingLead.name !== 'Visitante') 
      ? pendingLead.name 
      : (contactName || 'Lead via WhatsApp');

    console.log('🔒 Nome que será usado no lead final:', {
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
      console.error('❌ Erro ao verificar lead existente:', leadCheckError);
      return;
    }

    if (existingLead && existingLead.length > 0) {
      console.log('📝 Lead existente encontrado, atualizando status para "lead"...');
      
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
        console.error('❌ Erro ao atualizar lead existente:', updateError);
      } else {
        console.log('✅ Lead existente atualizado para status "lead" com mensagem');
      }
    } else {
      console.log('🆕 Criando novo lead a partir do pending_lead...');
      
      // 🆕 EXTRAIR DADOS UTM EXPANDIDOS DO WEBHOOK_DATA
      const webhookData = pendingLead.webhook_data || {};
      
      // ✅ CRIAR NOVO LEAD COM STATUS "LEAD" E DADOS EXPANDIDOS
      const newLeadData = {
        name: finalName,
        phone: phone,
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
          facebook_ad_id: deviceData.facebook_ad_id,
          facebook_adset_id: deviceData.facebook_adset_id,
          facebook_campaign_id: deviceData.facebook_campaign_id
        }),
        custom_fields: deviceData ? { 
          device_info: deviceData,
          utm_expanded: webhookData
        } : { utm_expanded: webhookData }
      };

      console.log('💾 Dados do novo lead (com dados expandidos):', newLeadData);

      const { error: insertError } = await supabase
        .from('leads')
        .insert(newLeadData);

      if (insertError) {
        console.error('❌ Erro ao criar novo lead:', insertError);
      } else {
        console.log('✅ Novo lead criado com status "lead" e dados expandidos!');
      }
    }

    // Marcar pending_lead como processado
    const { error: updatePendingError } = await supabase
      .from('pending_leads')
      .update({ status: 'converted' })
      .eq('id', pendingLead.id);

    if (updatePendingError) {
      console.error('❌ Erro ao marcar pending_lead como convertido:', updatePendingError);
    } else {
      console.log('✅ Pending lead marcado como convertido');
    }

  } catch (error) {
    console.error('❌ Erro geral em handlePendingLeadConversion:', error);
  }
};

// ✅ FUNÇÃO ATUALIZADA PARA USAR A FUNÇÃO SUPABASE
export const convertPendingLeadToLead = async (supabase: any, pendingLead: any) => {
  console.log('🔄 convertPendingLeadToLead - Convertendo usando função Supabase:', pendingLead.id);
  
  try {
    // Usar a nova função Supabase para conversão segura
    const { data: result, error } = await supabase.rpc('convert_pending_lead_secure', {
      pending_lead_id: pendingLead.id
    });

    if (error) {
      console.error('❌ Erro ao executar função Supabase:', error);
      return false;
    }

    console.log('📋 Resultado da conversão:', result);

    if (result?.success) {
      console.log('✅ Conversão automática via função Supabase bem-sucedida');
      return true;
    } else {
      console.error('❌ Falha na conversão via função Supabase:', result?.error);
      return false;
    }
  } catch (error) {
    console.error('❌ Erro em convertPendingLeadToLead:', error);
    return false;
  }
};
