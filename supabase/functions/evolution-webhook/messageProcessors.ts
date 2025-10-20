
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

// ✅ FUNÇÃO ATUALIZADA PARA PROCESSAR MENSAGENS DE CLIENTE (AGORA SALVA A MENSAGEM)
export const processClientMessage = async (params: {
  supabase: any;
  message: any;
  realPhoneNumber: string;
  matchedLeads: any[];
  messageContent: string;
}) => {
  const { supabase, message, realPhoneNumber, matchedLeads, messageContent } = params;
  
  console.log(`📱 Processing client message from: ${realPhoneNumber}`);
  
  // Primeiro, tentar conversão de pending_lead (fluxo formulário)
  const { handlePendingLeadConversion } = await import('./pendingLeadHandler.ts');
  await handlePendingLeadConversion(
    supabase,
    realPhoneNumber,
    messageContent,
    message.key?.id || '',
    message.status || 'received',
    message.pushName
  );
  
  // Atualizar leads existentes com mensagem e data de contato
  for (const lead of matchedLeads) {
    try {
      const updateData: any = {
        last_contact_date: new Date().toISOString(),
        evolution_message_id: message.key?.id,
        evolution_status: message.status,
        last_message: messageContent, // 🔥 ADICIONAR A MENSAGEM AQUI
      };

      // Se é a primeira mensagem do lead, definir como initial_message também
      if (!lead.initial_message) {
        updateData.initial_message = `Primeira mensagem: ${messageContent}`;
      }

      const { error: updateError } = await supabase
        .from('leads')
        .update(updateData)
        .eq('id', lead.id);

      if (updateError) {
        console.error(`❌ Error updating lead ${lead.id}:`, updateError);
      } else {
        console.log(`✅ Updated lead ${lead.id} with message: ${messageContent.substring(0, 50)}...`);
      }

      // Salvar mensagem no histórico de chat
      const { error: messageError } = await supabase
        .from('lead_messages')
        .insert({
          lead_id: lead.id,
          message_text: messageContent,
          is_from_me: false,
          whatsapp_message_id: message.key?.id,
          instance_name: message.key?.remoteJid?.split('@')[0] || null,
        });

      if (messageError) {
        console.error(`❌ Error saving message for lead ${lead.id}:`, messageError);
      } else {
        console.log(`✅ Message saved in chat history for lead ${lead.id}`);
      }
    } catch (error) {
      console.error(`❌ Error processing lead ${lead.id}:`, error);
    }
  }
};

// ✅ FUNÇÃO ATUALIZADA PARA PROCESSAR MENSAGENS COMERCIAIS (SEM ATUALIZAR last_message)
export const processComercialMessage = async (params: {
  supabase: any;
  message: any;
  realPhoneNumber: string;
  matchedLeads: any[];
  messageContent: string;
}) => {
  const { supabase, message, realPhoneNumber, matchedLeads, messageContent } = params;
  
  console.log(`💼 Processing commercial message to: ${realPhoneNumber}`);
  
  // Verificar palavras-chave de conversão e cancelamento
  for (const lead of matchedLeads) {
    const campaign = lead.campaigns;
    let newStatus = lead.status;
    
    if (campaign?.conversion_keywords) {
      const hasConversionKeyword = campaign.conversion_keywords.some((keyword: string) =>
        messageContent.toLowerCase().includes(keyword.toLowerCase())
      );
      
      if (hasConversionKeyword) {
        newStatus = 'converted';
        console.log(`🎉 Conversion detected for lead ${lead.id}`);
      }
    }
    
    if (campaign?.cancellation_keywords) {
      const hasCancellationKeyword = campaign.cancellation_keywords.some((keyword: string) =>
        messageContent.toLowerCase().includes(keyword.toLowerCase())
      );
      
      if (hasCancellationKeyword) {
        newStatus = 'cancelled';
        console.log(`❌ Cancellation detected for lead ${lead.id}`);
      }
    }
    
    // Atualizar lead APENAS com data de contato e status (preservar primeira mensagem)
    try {
      const { error: updateError } = await supabase
        .from('leads')
        .update({
          last_contact_date: new Date().toISOString(),
          evolution_message_id: message.key?.id,
          evolution_status: message.status,
          status: newStatus,
        })
        .eq('id', lead.id);

      if (updateError) {
        console.error(`❌ Error updating lead ${lead.id}:`, updateError);
      } else {
        console.log(`✅ Updated lead ${lead.id} with status: ${newStatus} (preserving first message)`);
      }

      // Salvar mensagem comercial no histórico de chat
      const { error: messageError } = await supabase
        .from('lead_messages')
        .insert({
          lead_id: lead.id,
          message_text: messageContent,
          is_from_me: true,
          whatsapp_message_id: message.key?.id,
          instance_name: message.key?.remoteJid?.split('@')[0] || null,
        });

      if (messageError) {
        console.error(`❌ Error saving commercial message for lead ${lead.id}:`, messageError);
      } else {
        console.log(`✅ Commercial message saved in chat history for lead ${lead.id}`);
      }
    } catch (error) {
      console.error(`❌ Error processing lead ${lead.id}:`, error);
    }
  }
};
