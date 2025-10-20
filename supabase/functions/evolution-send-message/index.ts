import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { instanceName, phone, message, leadId } = await req.json();
    
    console.log('📤 Enviando mensagem:', { instanceName, phone, message, leadId });

    if (!instanceName || !phone || !message || !leadId) {
      throw new Error('Parâmetros obrigatórios: instanceName, phone, message, leadId');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar instância ativa
    const { data: instance, error: instanceError } = await supabase
      .from('whatsapp_instances')
      .select('*')
      .eq('instance_name', instanceName)
      .eq('status', 'connected')
      .single();

    if (instanceError || !instance) {
      console.error('❌ Instância não encontrada ou desconectada:', instanceError);
      throw new Error('Instância WhatsApp não disponível');
    }

    const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY');
    if (!evolutionApiKey) {
      throw new Error('EVOLUTION_API_KEY não configurada');
    }

    // Enviar mensagem via Evolution API
    const evolutionUrl = `${instance.base_url}/message/sendText/${instanceName}`;
    console.log('🌐 Chamando Evolution API:', evolutionUrl);

    const evolutionResponse = await fetch(evolutionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': evolutionApiKey,
      },
      body: JSON.stringify({
        number: phone,
        text: message,
      }),
    });

    if (!evolutionResponse.ok) {
      const errorText = await evolutionResponse.text();
      console.error('❌ Erro na Evolution API:', errorText);
      throw new Error(`Evolution API error: ${evolutionResponse.status}`);
    }

    const evolutionData = await evolutionResponse.json();
    console.log('✅ Resposta Evolution API:', evolutionData);

    // Salvar mensagem no banco de dados
    const { data: savedMessage, error: saveError } = await supabase
      .from('lead_messages')
      .insert({
        lead_id: leadId,
        message_text: message,
        is_from_me: true,
        status: 'sent',
        whatsapp_message_id: evolutionData.key?.id || null,
        instance_name: instanceName,
      })
      .select()
      .single();

    if (saveError) {
      console.error('❌ Erro ao salvar mensagem:', saveError);
      throw saveError;
    }

    console.log('✅ Mensagem salva:', savedMessage);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: savedMessage,
        evolutionResponse: evolutionData 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('❌ Erro ao enviar mensagem:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
