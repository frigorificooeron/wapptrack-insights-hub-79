
import { getDeviceDataByPhone } from './deviceDataHandler.ts';
import { getTrackingDataBySession } from './sessionTrackingHandler.ts';

// 🆕 HANDLER MELHORADO COM MÉTODOS 1 + 2 COMBINADOS
export const handleEnhancedPendingLeadConversion = async (
  supabase: any, 
  phone: string, 
  messageText: string, 
  messageId: string, 
  status: string, 
  contactName?: string,
  messageTimestamp?: string
) => {
  console.log(`🔄 [ENHANCED PENDING] Iniciando conversão melhorada para: ${phone}`);
  
  try {
    const messageTime = messageTimestamp ? new Date(messageTimestamp) : new Date();
    const correlationWindow = 5 * 60 * 1000; // 5 minutos
    const windowStart = new Date(messageTime.getTime() - correlationWindow);
    
    console.log(`🕒 [ENHANCED PENDING] Janela de correlação: ${windowStart.toISOString()} - ${messageTime.toISOString()}`);

    // 🎯 MÉTODO 1: BUSCA PENDING_LEADS MELHORADA (mais critérios)
    let matchedPendingLead = null;
    
    // 1.1 - Buscar por telefone exato primeiro
    const { data: exactPhoneLeads, error: exactError } = await supabase
      .from('pending_leads')
      .select('*')
      .eq('phone', phone)
      .eq('status', 'pending')
      .gte('created_at', windowStart.toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (!exactError && exactPhoneLeads && exactPhoneLeads.length > 0) {
      matchedPendingLead = exactPhoneLeads[0];
      console.log(`✅ [ENHANCED PENDING] Método 1.1 - Match por telefone exato:`, matchedPendingLead.id);
    }

    // 1.2 - Buscar PENDING_CONTACT com correlação temporal
    if (!matchedPendingLead) {
      const { data: pendingContactLeads, error: pendingError } = await supabase
        .from('pending_leads')
        .select('*')
        .eq('phone', 'PENDING_CONTACT')
        .eq('status', 'pending')
        .gte('created_at', windowStart.toISOString())
        .order('created_at', { ascending: false });

      if (!pendingError && pendingContactLeads && pendingContactLeads.length > 0) {
        // Buscar o mais recente dentro da janela
        matchedPendingLead = pendingContactLeads[0];
        console.log(`✅ [ENHANCED PENDING] Método 1.2 - Match por PENDING_CONTACT temporal:`, matchedPendingLead.id);
      }
    }

    // 🎯 MÉTODO 2: CORRELAÇÃO POR DADOS DE SESSÃO SE NÃO ENCONTROU
    let sessionCorrelationData = null;
    if (!matchedPendingLead) {
      console.log(`🔍 [ENHANCED PENDING] Método 1 falhou, tentando Método 2 - correlação por sessão`);
      
      // Buscar dados do dispositivo para este telefone
      const deviceData = await getDeviceDataByPhone(supabase, phone);
      
      if (deviceData) {
        console.log(`📱 [ENHANCED PENDING] Dados do dispositivo encontrados, tentando correlação...`);
        
        // Buscar tracking data correlacionada
        sessionCorrelationData = await getTrackingDataBySession(supabase, deviceData);
        
        if (sessionCorrelationData?.campaign_id) {
          console.log(`🎯 [ENHANCED PENDING] Correlação por sessão encontrou campaign_id:`, sessionCorrelationData.campaign_id);
          
          // Buscar pending_lead por campaign_id dentro da janela temporal
          const { data: correlatedLeads, error: correlatedError } = await supabase
            .from('pending_leads')
            .select('*')
            .eq('campaign_id', sessionCorrelationData.campaign_id)
            .eq('status', 'pending')
            .gte('created_at', windowStart.toISOString())
            .order('created_at', { ascending: false })
            .limit(1);

          if (!correlatedError && correlatedLeads && correlatedLeads.length > 0) {
            matchedPendingLead = correlatedLeads[0];
            console.log(`✅ [ENHANCED PENDING] Método 2 - Match por correlação de sessão:`, matchedPendingLead.id);
          }
        }
      }
    }

    // ❌ SE NENHUM MÉTODO FUNCIONOU
    if (!matchedPendingLead) {
      console.log(`❌ [ENHANCED PENDING] Nenhum pending_lead encontrado com ambos os métodos para: ${phone}`);
      return false;
    }

    // ✅ CONVERSÃO ENCONTRADA - PROSSEGUIR
    console.log(`🎉 [ENHANCED PENDING] Pending lead encontrado para conversão:`, {
      id: matchedPendingLead.id,
      campaign_id: matchedPendingLead.campaign_id,
      method: sessionCorrelationData ? 'session_correlation' : 'direct_search',
      phone_original: matchedPendingLead.phone
    });

    // Buscar user_id da campanha
    let campaignUserId = null;
    if (matchedPendingLead.campaign_id) {
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .select('user_id')
        .eq('id', matchedPendingLead.campaign_id)
        .single();

      if (campaign && !campaignError) {
        campaignUserId = campaign.user_id;
        console.log('✅ [ENHANCED PENDING] User ID da campanha encontrado:', campaignUserId);
      } else {
        // Fallback para user default
        try {
          const { data: fallbackUserId, error: fallbackError } = await supabase
            .rpc('get_user_by_instance', { instance_name_param: 'default' });
          
          if (!fallbackError && fallbackUserId) {
            campaignUserId = fallbackUserId;
            console.log('✅ [ENHANCED PENDING] User ID obtido via fallback:', campaignUserId);
          }
        } catch (fallbackErr) {
          console.error('❌ [ENHANCED PENDING] Erro no fallback user_id:', fallbackErr);
        }
      }
    }

    // Buscar dados do dispositivo para enriquecer o lead
    const deviceData = await getDeviceDataByPhone(supabase, phone);

    // Preservar o nome do formulário
    const finalName = (matchedPendingLead.name && matchedPendingLead.name !== 'Visitante') 
      ? matchedPendingLead.name 
      : (contactName || 'Lead via WhatsApp');

    console.log('🔒 [ENHANCED PENDING] Dados finais para conversão:', {
      finalName,
      phone,
      userId: campaignUserId,
      hasDeviceData: !!deviceData,
      correlationMethod: sessionCorrelationData ? 'session' : 'direct'
    });

    // Verificar se já existe um lead para este telefone
    const { data: existingLead, error: leadCheckError } = await supabase
      .from('leads')
      .select('*')
      .eq('phone', phone)
      .limit(1);

    if (leadCheckError) {
      console.error('❌ [ENHANCED PENDING] Erro ao verificar lead existente:', leadCheckError);
      return false;
    }

    // Extrair dados expandidos do webhook_data
    const webhookData = matchedPendingLead.webhook_data || {};
    const correlationMetadata = {
      conversion_method: sessionCorrelationData ? 'enhanced_session_correlation' : 'enhanced_direct_search',
      correlation_timestamp: new Date().toISOString(),
      original_phone: matchedPendingLead.phone,
      message_delay_seconds: Math.floor((messageTime.getTime() - new Date(matchedPendingLead.created_at).getTime()) / 1000),
      device_session_id: webhookData.device_session_id,
      campaign_click_id: webhookData.campaign_click_id
    };

    if (existingLead && existingLead.length > 0) {
      console.log('📝 [ENHANCED PENDING] Lead existente encontrado, atualizando...');
      
      const updateData: any = {
        status: 'lead', // Status "lead" quando receber mensagem
        last_contact_date: new Date().toISOString(),
        evolution_message_id: messageId,
        evolution_status: status,
        last_message: messageText,
        initial_message: `Primeira mensagem: ${messageText}`,
        // Adicionar metadados de correlação
        custom_fields: {
          ...existingLead[0].custom_fields,
          correlation_metadata: correlationMetadata,
          device_info: deviceData
        }
      };
      
      // Adicionar dados do dispositivo se disponíveis
      if (deviceData) {
        Object.assign(updateData, {
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
          language: deviceData.language
        });
      }

      const { error: updateError } = await supabase
        .from('leads')
        .update(updateData)
        .eq('id', existingLead[0].id);

      if (updateError) {
        console.error('❌ [ENHANCED PENDING] Erro ao atualizar lead existente:', updateError);
        return false;
      } else {
        console.log('✅ [ENHANCED PENDING] Lead existente atualizado para status "lead"');
      }
    } else {
      console.log('🆕 [ENHANCED PENDING] Criando novo lead...');
      
      // Criar novo lead com dados expandidos
      const newLeadData = {
        name: finalName,
        phone: phone,
        campaign: matchedPendingLead.campaign_name || 'WhatsApp',
        campaign_id: matchedPendingLead.campaign_id,
        user_id: campaignUserId,
        status: 'lead', // Status "lead" quando criar a partir de mensagem
        last_message: messageText,
        initial_message: `Primeira mensagem: ${messageText}`,
        first_contact_date: new Date().toISOString(),
        last_contact_date: new Date().toISOString(),
        evolution_message_id: messageId,
        evolution_status: status,
        notes: `Lead criado via correlação melhorada (${correlationMetadata.conversion_method})`,
        utm_source: matchedPendingLead.utm_source,
        utm_medium: matchedPendingLead.utm_medium,
        utm_campaign: matchedPendingLead.utm_campaign,
        utm_content: matchedPendingLead.utm_content,
        utm_term: matchedPendingLead.utm_term,
        // Dados expandidos UTM e dispositivo
        ad_account: webhookData.site_source_name || '',
        ad_set_name: webhookData.adset_name || '',
        ad_name: webhookData.ad_name || '',
        tracking_method: correlationMetadata.conversion_method,
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
          facebook_ad_id: deviceData.facebook_ad_id || webhookData.facebook_ad_id,
          facebook_adset_id: deviceData.facebook_adset_id || webhookData.facebook_adset_id,
          facebook_campaign_id: deviceData.facebook_campaign_id || webhookData.facebook_campaign_id
        }),
        // Dados de correlação
        custom_fields: { 
          correlation_metadata: correlationMetadata,
          device_info: deviceData,
          utm_expanded: webhookData,
          session_correlation: sessionCorrelationData
        }
      };

      console.log('💾 [ENHANCED PENDING] Dados do novo lead (método combinado):', {
        name: newLeadData.name,
        phone: newLeadData.phone,
        conversion_method: correlationMetadata.conversion_method,
        message_delay: correlationMetadata.message_delay_seconds,
        user_id: newLeadData.user_id,
        campaign_id: newLeadData.campaign_id
      });

      const { error: insertError } = await supabase
        .from('leads')
        .insert(newLeadData);

      if (insertError) {
        console.error('❌ [ENHANCED PENDING] Erro ao criar novo lead:', insertError);
        return false;
      } else {
        console.log('✅ [ENHANCED PENDING] Novo lead criado com correlação melhorada!');
      }
    }

    // Marcar pending_lead como convertido
    const { error: updatePendingError } = await supabase
      .from('pending_leads')
      .update({ 
        status: 'converted',
        phone: phone, // Atualizar com telefone real
        webhook_data: {
          ...webhookData,
          conversion_metadata: correlationMetadata
        }
      })
      .eq('id', matchedPendingLead.id);

    if (updatePendingError) {
      console.error('❌ [ENHANCED PENDING] Erro ao marcar pending_lead como convertido:', updatePendingError);
    } else {
      console.log('✅ [ENHANCED PENDING] Pending lead marcado como convertido com metadados');
    }

    return true;

  } catch (error) {
    console.error('❌ [ENHANCED PENDING] Erro geral na conversão melhorada:', error);
    return false;
  }
};
