import { getDeviceDataByPhone } from './deviceDataHandler.ts';
import { getTrackingDataBySession } from './sessionTrackingHandler.ts';
import { handleCTWACorrelation } from './ctwaCorrelationHandler.ts';

// 🆕 HANDLER MELHORADO COM MÉTODOS 1 + 2 + CTWA COMBINADOS + LOGS DETALHADOS
export const handleEnhancedPendingLeadConversion = async (
  supabase: any, 
  phone: string, 
  messageText: string, 
  messageId: string, 
  status: string, 
  contactName?: string,
  messageTimestamp?: string
) => {
  console.log(`🔄 [ENHANCED PENDING] ===== INICIANDO CONVERSÃO MELHORADA COM CTWA =====`);
  console.log(`🔄 [ENHANCED PENDING] Parâmetros recebidos:`, {
    phone,
    messageText: messageText?.substring(0, 100),
    messageId,
    status,
    contactName,
    messageTimestamp
  });
  
  try {
    // 🎯 MÉTODO CTWA: TENTAR CORRELAÇÃO CTWA PRIMEIRO
    console.log('🎯 [ENHANCED PENDING] ===== TENTANDO CORRELAÇÃO CTWA =====');
    const ctwaCorrelationResult = await handleCTWACorrelation(
      supabase,
      phone,
      messageText,
      messageId,
      status,
      contactName,
      messageTimestamp
    );

    if (ctwaCorrelationResult) {
      console.log('🎉 [ENHANCED PENDING] SUCESSO! Correlação CTWA encontrou e converteu o lead');
      return true;
    }

    console.log('ℹ️ [ENHANCED PENDING] Correlação CTWA não encontrou match, tentando métodos tradicionais...');

    // Continue with existing methods if CTWA correlation fails
    const messageTime = messageTimestamp ? new Date(messageTimestamp) : new Date();
    const correlationWindow = 5 * 60 * 1000; // 5 minutos
    const windowStart = new Date(messageTime.getTime() - correlationWindow);
    
    console.log(`🕒 [ENHANCED PENDING] Janela de correlação tradicional configurada:`, {
      messageTime: messageTime.toISOString(),
      windowStart: windowStart.toISOString(),
      correlationWindowMs: correlationWindow
    });

    // 🎯 MÉTODO 1: BUSCA PENDING_LEADS MELHORADA (mais critérios)
    let matchedPendingLead = null;
    
    console.log(`🔍 [ENHANCED PENDING] ===== MÉTODO 1: BUSCA DIRETA =====`);
    
    // 1.1 - Buscar por telefone exato primeiro
    console.log(`🔍 [ENHANCED PENDING] 1.1 - Buscando por telefone exato: ${phone}`);
    const { data: exactPhoneLeads, error: exactError } = await supabase
      .from('pending_leads')
      .select('*')
      .eq('phone', phone)
      .eq('status', 'pending')
      .gte('created_at', windowStart.toISOString())
      .order('created_at', { ascending: false })
      .limit(5);

    console.log(`📋 [ENHANCED PENDING] Resultado busca telefone exato:`, {
      error: exactError,
      count: exactPhoneLeads?.length || 0,
      leads: exactPhoneLeads?.map(lead => ({
        id: lead.id,
        phone: lead.phone,
        created_at: lead.created_at,
        campaign_id: lead.campaign_id
      }))
    });

    if (!exactError && exactPhoneLeads && exactPhoneLeads.length > 0) {
      matchedPendingLead = exactPhoneLeads[0];
      console.log(`✅ [ENHANCED PENDING] Método 1.1 - Match por telefone exato encontrado:`, {
        id: matchedPendingLead.id,
        phone: matchedPendingLead.phone,
        created_at: matchedPendingLead.created_at
      });
    }

    // 1.2 - Buscar PENDING_CONTACT com correlação temporal
    if (!matchedPendingLead) {
      console.log(`🔍 [ENHANCED PENDING] 1.2 - Buscando PENDING_CONTACT na janela temporal...`);
      const { data: pendingContactLeads, error: pendingError } = await supabase
        .from('pending_leads')
        .select('*')
        .eq('phone', 'PENDING_CONTACT')
        .eq('status', 'pending')
        .gte('created_at', windowStart.toISOString())
        .order('created_at', { ascending: false });

      console.log(`📋 [ENHANCED PENDING] Resultado busca PENDING_CONTACT:`, {
        error: pendingError,
        count: pendingContactLeads?.length || 0,
        leads: pendingContactLeads?.map(lead => ({
          id: lead.id,
          phone: lead.phone,
          created_at: lead.created_at,
          campaign_id: lead.campaign_id,
          device_session_id: lead.webhook_data?.device_session_id
        }))
      });

      if (!pendingError && pendingContactLeads && pendingContactLeads.length > 0) {
        matchedPendingLead = pendingContactLeads[0];
        console.log(`✅ [ENHANCED PENDING] Método 1.2 - Match por PENDING_CONTACT encontrado:`, {
          id: matchedPendingLead.id,
          created_at: matchedPendingLead.created_at,
          time_diff_seconds: Math.floor((messageTime.getTime() - new Date(matchedPendingLead.created_at).getTime()) / 1000)
        });
      }
    }

    // 🎯 MÉTODO 2: CORRELAÇÃO POR DADOS DE SESSÃO SE NÃO ENCONTROU
    let sessionCorrelationData = null;
    if (!matchedPendingLead) {
      console.log(`🔍 [ENHANCED PENDING] ===== MÉTODO 2: CORRELAÇÃO POR SESSÃO =====`);
      console.log(`🔍 [ENHANCED PENDING] Método 1 falhou, tentando correlação por sessão...`);
      
      // Buscar dados do dispositivo para este telefone
      console.log(`📱 [ENHANCED PENDING] Buscando dados do dispositivo para: ${phone}`);
      const deviceData = await getDeviceDataByPhone(supabase, phone);
      
      if (deviceData) {
        console.log(`📱 [ENHANCED PENDING] Dados do dispositivo encontrados:`, {
          device_type: deviceData.device_type,
          browser: deviceData.browser,
          location: deviceData.location,
          created_at: deviceData.created_at
        });
        
        // Buscar tracking data correlacionada
        console.log(`🔗 [ENHANCED PENDING] Buscando correlação de tracking...`);
        sessionCorrelationData = await getTrackingDataBySession(supabase, deviceData);
        
        if (sessionCorrelationData?.campaign_id) {
          console.log(`🎯 [ENHANCED PENDING] Correlação encontrou campaign_id:`, {
            campaign_id: sessionCorrelationData.campaign_id,
            session_id: sessionCorrelationData.session_id
          });
          
          // Buscar pending_lead por campaign_id dentro da janela temporal
          console.log(`🔍 [ENHANCED PENDING] Buscando pending_lead por campaign_id: ${sessionCorrelationData.campaign_id}`);
          const { data: correlatedLeads, error: correlatedError } = await supabase
            .from('pending_leads')
            .select('*')
            .eq('campaign_id', sessionCorrelationData.campaign_id)
            .eq('status', 'pending')
            .gte('created_at', windowStart.toISOString())
            .order('created_at', { ascending: false })
            .limit(3);

          console.log(`📋 [ENHANCED PENDING] Resultado correlação por campaign_id:`, {
            error: correlatedError,
            count: correlatedLeads?.length || 0,
            leads: correlatedLeads?.map(lead => ({
              id: lead.id,
              phone: lead.phone,
              created_at: lead.created_at
            }))
          });

          if (!correlatedError && correlatedLeads && correlatedLeads.length > 0) {
            matchedPendingLead = correlatedLeads[0];
            console.log(`✅ [ENHANCED PENDING] Método 2 - Match por correlação de sessão encontrado:`, {
              id: matchedPendingLead.id,
              campaign_id: matchedPendingLead.campaign_id
            });
          }
        } else {
          console.log(`❌ [ENHANCED PENDING] Correlação de sessão não retornou campaign_id`);
        }
      } else {
        console.log(`❌ [ENHANCED PENDING] Nenhum dado do dispositivo encontrado para: ${phone}`);
      }
    }

    // ❌ SE NENHUM MÉTODO FUNCIONOU
    if (!matchedPendingLead) {
      console.log(`❌ [ENHANCED PENDING] ===== FALHA TOTAL (INCLUINDO CTWA) =====`);
      console.log(`❌ [ENHANCED PENDING] Nenhum pending_lead encontrado com todos os métodos`, {
        phone,
        windowStart: windowStart.toISOString(),
        messageTime: messageTime.toISOString(),
        methodsAttempted: ['ctwa_correlation', 'exact_phone', 'pending_contact', 'session_correlation']
      });
      
      // 🔍 DEBUG: Listar todos os pending_leads para análise
      console.log(`🔍 [ENHANCED PENDING] DEBUG: Listando todos os pending_leads recentes...`);
      const { data: allPendingLeads } = await supabase
        .from('pending_leads')
        .select('*')
        .eq('status', 'pending')
        .gte('created_at', new Date(Date.now() - 30 * 60 * 1000).toISOString()) // últimos 30 minutos
        .order('created_at', { ascending: false })
        .limit(10);
      
      console.log(`📋 [ENHANCED PENDING] Pending leads recentes encontrados:`, {
        count: allPendingLeads?.length || 0,
        leads: allPendingLeads?.map(lead => ({
          id: lead.id,
          phone: lead.phone,
          created_at: lead.created_at,
          campaign_id: lead.campaign_id,
          name: lead.name
        }))
      });
      
      return false;
    }

    // ✅ CONVERSÃO ENCONTRADA - PROSSEGUIR
    console.log(`🎉 [ENHANCED PENDING] ===== PENDING LEAD ENCONTRADO =====`);
    console.log(`🎉 [ENHANCED PENDING] Iniciando conversão:`, {
      id: matchedPendingLead.id,
      campaign_id: matchedPendingLead.campaign_id,
      method: sessionCorrelationData ? 'session_correlation' : 'direct_search',
      phone_original: matchedPendingLead.phone,
      phone_message: phone,
      time_diff_seconds: Math.floor((messageTime.getTime() - new Date(matchedPendingLead.created_at).getTime()) / 1000)
    });

    // Buscar user_id da campanha
    let campaignUserId = null;
    if (matchedPendingLead.campaign_id) {
      console.log(`🔍 [ENHANCED PENDING] Buscando user_id para campaign_id: ${matchedPendingLead.campaign_id}`);
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .select('user_id, name')
        .eq('id', matchedPendingLead.campaign_id)
        .single();

      if (campaign && !campaignError) {
        campaignUserId = campaign.user_id;
        console.log('✅ [ENHANCED PENDING] User ID da campanha encontrado:', {
          user_id: campaignUserId,
          campaign_name: campaign.name
        });
      } else {
        console.log('⚠️ [ENHANCED PENDING] Campanha não encontrada, usando fallback...');
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

    console.log('🔒 [ENHANCED PENDING] ===== PREPARANDO CONVERSÃO =====');
    console.log('🔒 [ENHANCED PENDING] Dados finais para conversão:', {
      finalName,
      phone,
      userId: campaignUserId,
      hasDeviceData: !!deviceData,
      correlationMethod: sessionCorrelationData ? 'session' : 'direct'
    });

    // Verificar se já existe um lead para este telefone
    console.log(`🔍 [ENHANCED PENDING] Verificando se já existe lead para: ${phone}`);
    const { data: existingLead, error: leadCheckError } = await supabase
      .from('leads')
      .select('*')
      .eq('phone', phone)
      .limit(1);

    if (leadCheckError) {
      console.error('❌ [ENHANCED PENDING] Erro ao verificar lead existente:', leadCheckError);
      return false;
    }

    console.log(`📋 [ENHANCED PENDING] Resultado verificação lead existente:`, {
      exists: !!(existingLead && existingLead.length > 0),
      count: existingLead?.length || 0,
      existing_lead_id: existingLead?.[0]?.id
    });

    // Extrair dados expandidos do webhook_data
    const webhookData = matchedPendingLead.webhook_data || {};
    const correlationMetadata = {
      conversion_method: sessionCorrelationData ? 'enhanced_session_correlation' : 'enhanced_direct_search',
      correlation_timestamp: new Date().toISOString(),
      original_phone: matchedPendingLead.phone,
      message_delay_seconds: Math.floor((messageTime.getTime() - new Date(matchedPendingLead.created_at).getTime()) / 1000),
      device_session_id: webhookData.device_session_id,
      campaign_click_id: webhookData.campaign_click_id,
      pending_lead_id: matchedPendingLead.id
    };

    if (existingLead && existingLead.length > 0) {
      console.log('📝 [ENHANCED PENDING] ===== ATUALIZANDO LEAD EXISTENTE =====');
      
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

      console.log('💾 [ENHANCED PENDING] Dados que serão atualizados no lead:', {
        id: existingLead[0].id,
        status: updateData.status,
        last_message: updateData.last_message?.substring(0, 100),
        correlation_method: correlationMetadata.conversion_method
      });

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
      console.log('🆕 [ENHANCED PENDING] ===== CRIANDO NOVO LEAD =====');
      
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

      console.log('💾 [ENHANCED PENDING] Dados do novo lead que serão inseridos:', {
        name: newLeadData.name,
        phone: newLeadData.phone,
        campaign: newLeadData.campaign,
        conversion_method: correlationMetadata.conversion_method,
        message_delay: correlationMetadata.message_delay_seconds,
        user_id: newLeadData.user_id,
        campaign_id: newLeadData.campaign_id,
        has_device_data: !!deviceData
      });

      const { data: insertedLead, error: insertError } = await supabase
        .from('leads')
        .insert(newLeadData)
        .select()
        .single();

      if (insertError) {
        console.error('❌ [ENHANCED PENDING] Erro ao criar novo lead:', insertError);
        return false;
      } else {
        console.log('✅ [ENHANCED PENDING] Novo lead criado com sucesso:', {
          id: insertedLead.id,
          name: insertedLead.name,
          phone: insertedLead.phone,
          status: insertedLead.status
        });
      }
    }

    // Marcar pending_lead como convertido
    console.log('🔄 [ENHANCED PENDING] Marcando pending_lead como convertido...');
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
      console.log('✅ [ENHANCED PENDING] Pending lead marcado como convertido');
    }

    console.log('🎉 [ENHANCED PENDING] ===== CONVERSÃO CONCLUÍDA COM SUCESSO =====');
    return true;

  } catch (error) {
    console.error('❌ [ENHANCED PENDING] ERRO GERAL na conversão melhorada com CTWA:', error);
    return false;
  }
};
