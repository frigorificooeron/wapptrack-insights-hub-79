import { supabase } from "../integrations/supabase/client";
import { getDeviceDataByPhone } from "./deviceDataService";
import { captureAndSaveDeviceData } from "@/lib/dataCollection";
import type { ConversionResult } from '@/types/supabase-functions';

/**
 * ✅ FUNÇÃO PARA SALVAR DADOS COMPLETOS DE DISPOSITIVO E UTMs
 */
const saveDeviceAndUtmData = async (
  phone: string,
  utms?: {
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_content?: string;
    utm_term?: string;
    gclid?: string;
    fbclid?: string;
  }
) => {
  try {
    console.log('📱 Iniciando captura completa de dados do dispositivo para:', phone);
    
    // Usar a função completa de captura de dados
    await captureAndSaveDeviceData(phone);
    
    console.log('✅ Dados do dispositivo salvos com sucesso para:', phone);
  } catch (error) {
    console.error('❌ Erro ao salvar dados do dispositivo:', error);
  }
};

/**
 * ✅ FUNÇÃO ATUALIZADA PARA USAR A FUNÇÃO SUPABASE SEGURA
 */
const convertPendingLeadToLead = async (pendingLeadData: any) => {
  try {
    console.log('🔄 [CONVERSÃO AUTOMÁTICA] Iniciando conversão usando função Supabase:', {
      id: pendingLeadData.id,
      name: pendingLeadData.name,
      phone: pendingLeadData.phone,
      campaign_id: pendingLeadData.campaign_id
    });

    // Usar a nova função Supabase para conversão segura
    const { data: result, error } = await supabase.rpc('convert_pending_lead_secure', {
      pending_lead_id: pendingLeadData.id
    });

    if (error) {
      console.error('❌ [CONVERSÃO AUTOMÁTICA] Erro ao executar função Supabase:', error);
      return false;
    }

    console.log('📋 [CONVERSÃO AUTOMÁTICA] Resultado da conversão:', result);

    const typedResult = result as unknown as ConversionResult;

    if (typedResult?.success) {
      console.log('✅ [CONVERSÃO AUTOMÁTICA] Sucesso:', typedResult.message);
      return true;
    } else {
      console.error('❌ [CONVERSÃO AUTOMÁTICA] Falha na conversão:', typedResult?.error);
      return false;
    }
  } catch (error) {
    console.error('❌ [CONVERSÃO AUTOMÁTICA] Erro CATCH geral:', {
      error: error,
      message: error?.message,
      stack: error?.stack
    });
    return false;
  }
};

/**
 * Função principal para rastrear redirecionamentos e salvar leads
 * ✅ MODIFICADA PARA INCLUIR CAPTURA COMPLETA DE DADOS
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

    // ✅ VERIFICAR AUTENTICAÇÃO SEM EXIGIR
    const { data: { user } } = await supabase.auth.getUser();
    const isAuthenticated = !!user;
    console.log('🔐 Status de autenticação:', isAuthenticated ? 'Logado' : 'Público');

    // 🎯 SALVAR DADOS DETALHADOS DO DISPOSITIVO SEMPRE QUE HOUVER TELEFONE
    if (phone && phone !== 'Redirecionamento Direto') {
      console.log('📱 Salvando dados detalhados do dispositivo...');
      await saveDeviceAndUtmData(phone, utms);
    }

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

    const type = eventType || campaign.event_type || 'lead';

    // ⭐️ COMPORTAMENTOS POR TIPO DE REDIRECIONAMENTO
    if (campaign.redirect_type === 'whatsapp') {
      console.log(`🚦 Campanha de redirecionamento WhatsApp – Salvar em pending_leads (PÚBLICO)`, {
        id: campaign.id,
        name: campaign.name,
        utms,
        authenticated: isAuthenticated
      });
      
      // Para redirect_type: 'whatsapp', salvar em pending_leads (PÚBLICO)
      if (phone && phone !== 'Redirecionamento Direto') {
        try {
          // ✅ CRIAR PENDING LEAD SEMPRE (PÚBLICO)
          const pendingData = {
            name: name || 'Visitante',
            phone,
            campaign_id: campaign.id,
            campaign_name: campaign.name,
            utm_source: utms?.utm_source || null,
            utm_medium: utms?.utm_medium || null,
            utm_campaign: utms?.utm_campaign || null,
            utm_content: utms?.utm_content || (utms?.gclid ? `gclid=${utms.gclid}` : null) || null,
            utm_term: utms?.utm_term || (utms?.fbclid ? `fbclid=${utms.fbclid}` : null) || null,
            status: 'pending'
          };
          
          console.log('💾 Dados que serão salvos em pending_leads (PÚBLICO):', pendingData);
          
          // Limpar pending leads anteriores para este telefone
          await supabase
            .from('pending_leads')
            .delete()
            .eq('phone', phone)
            .eq('status', 'pending');

          const { error: pendingLeadError } = await supabase
            .from('pending_leads')
            .insert(pendingData);

          if (pendingLeadError) {
            console.error('❌ Erro ao criar pending_lead público:', pendingLeadError);
          } else {
            console.log('✅ pending_lead público salvo com sucesso:', pendingData);
          }
        } catch (pendingSaveErr) {
          console.error("❌ Erro ao gravar pending_lead público:", pendingSaveErr);
        }
      }

      return { targetPhone: campaign.whatsapp_number };
    }

    // ⭐️ PARA CAMPANHAS DE FORMULÁRIO, CRIAR PENDING LEAD E TENTAR CONVERSÃO AUTOMÁTICA
    if ((type === 'lead' || type === 'contact') && phone) {
      console.log('📝 [FORMULÁRIO] Processando campanha de formulário...');
      
      const pendingData = {
        name: name || 'Lead via Tracking',
        phone,
        campaign_id: campaign.id,
        campaign_name: campaign.name,
        status: 'pending',
        utm_source: utms?.utm_source || '',
        utm_medium: utms?.utm_medium || '',
        utm_campaign: utms?.utm_campaign || '',
        utm_content: utms?.utm_content || (utms?.gclid ? `gclid=${utms.gclid}` : '') || '',
        utm_term: utms?.utm_term || (utms?.fbclid ? `fbclid=${utms.fbclid}` : '') || '',
      };
      
      console.log('📝 [FORMULÁRIO] Salvando pending lead:', pendingData);

      // ✅ LIMPAR PENDING LEADS ANTERIORES ANTES DE CRIAR NOVO
      await supabase
        .from('pending_leads')
        .delete()
        .eq('phone', phone)
        .eq('status', 'pending');

      const { data: insertedPendingLead, error: pendingError } = await supabase
        .from('pending_leads')
        .insert(pendingData)
        .select()
        .single();

      if (pendingError) {
        console.error('❌ [FORMULÁRIO] Erro ao criar pending lead:', pendingError);
      } else {
        console.log('✅ [FORMULÁRIO] Pending lead criado:', insertedPendingLead.id);
        
        // ✅ AGUARDAR ANTES DA CONVERSÃO PARA GARANTIR COMMIT
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        console.log('🔄 [FORMULÁRIO] Iniciando conversão automática...');
        
        const conversionSuccess = await convertPendingLeadToLead(insertedPendingLead);
        
        if (conversionSuccess) {
          console.log('✅ [FORMULÁRIO] Conversão automática SUCESSO!');
          
          // Marcar pending_lead como convertido
          const { error: updateError } = await supabase
            .from('pending_leads')
            .update({ status: 'converted' })
            .eq('id', insertedPendingLead.id);

          if (updateError) {
            console.error('❌ [FORMULÁRIO] Erro ao marcar como convertido:', updateError);
          } else {
            console.log('✅ [FORMULÁRIO] Pending lead marcado como convertido');
          }
        } else {
          console.log('❌ [FORMULÁRIO] Conversão automática FALHOU');
        }
      }
    } else {
      console.log("🔎 Não é fluxo de lead/contact ou telefone não informado:", {
        type,
        phone
      });
    }

    return { targetPhone: campaign.whatsapp_number };
  } catch (error) {
    console.error('❌ [TRACK REDIRECT] Erro geral:', error);
    return { targetPhone: '5585998372658' };
  }
};
