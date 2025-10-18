import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { instanceName, webhook } = await req.json();
    
    // Validate instanceName presence
    if (!instanceName) {
      return new Response(JSON.stringify({
        success: false,
        error: 'instanceName is required'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate API key
    const apiKey = Deno.env.get('EVOLUTION_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Evolution API key not configured'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate instanceName format and length
    const trimmedName = instanceName.trim();
    const instanceNameRegex = /^[a-zA-Z0-9_-]{3,50}$/;
    
    if (!instanceNameRegex.test(trimmedName)) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Nome da instância inválido. Use apenas letras, números, hífen e underscore (3-50 caracteres)'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const baseUrl = "https://evolutionapi.workidigital.tech";
    const url = `${baseUrl}/instance/create`;
    
    console.log(`Creating instance: ${trimmedName}`);
    console.log('API Key configured:', !!apiKey);
    console.log('Base URL:', baseUrl);
    
    // Correct payload format based on Evolution API documentation
    const webhookUrl = webhook || `https://bwicygxyhkdgrypqrijo.supabase.co/functions/v1/evolution-webhook`;
    
    const requestBody = {
      instanceName: trimmedName,
      qrcode: true,
      integration: "WHATSAPP-BAILEYS",
      webhook: {
        url: webhookUrl,
        webhook_by_events: false,
        webhook_base64: true,
        events: [
          "QRCODE_UPDATED",
          "MESSAGES_UPSERT",
          "MESSAGES_UPDATE",
          "SEND_MESSAGE",
          "CONNECTION_UPDATE"
        ]
      },
      settings: {
        reject_call: false,
        msg_call: "",
        groups_ignore: true,
        always_online: false,
        read_messages: false,
        read_status: false,
        sync_full_history: false
      }
    };

    console.log('Request payload:', JSON.stringify(requestBody, null, 2));

    // Use only apikey header for authentication
    const headers = {
      'Content-Type': 'application/json',
      'apikey': apiKey,
      'Accept': 'application/json'
    };

    console.log('Request headers (without sensitive data):', {
      'Content-Type': headers['Content-Type'],
      'Accept': headers['Accept'],
      'apikey': '[REDACTED]'
    });

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    });

    console.log('Response status:', response.status, response.statusText);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    let data;
    let errorMessage = '';
    
    try {
      const responseText = await response.text();
      console.log('Raw response body:', responseText);
      
      if (responseText) {
        data = JSON.parse(responseText);
      } else {
        data = {};
      }
    } catch (parseError) {
      console.error('Failed to parse response as JSON:', parseError);
      errorMessage = `Invalid JSON response from Evolution API`;
      data = {};
    }

    if (!response.ok) {
      console.error('Evolution API error response:', data);
      
      // Extract meaningful error message from response
      let detailedError = `HTTP ${response.status}: ${response.statusText}`;
      
      if (data?.response?.message) {
        const messages = Array.isArray(data.response.message) 
          ? data.response.message.join(', ') 
          : data.response.message;
        detailedError += ` - ${messages}`;
      } else if (data?.message) {
        detailedError += ` - ${data.message}`;
      } else if (data?.error) {
        detailedError += ` - ${data.error}`;
      } else if (errorMessage) {
        detailedError += ` - ${errorMessage}`;
      }
      
      throw new Error(detailedError);
    }
    
    console.log('Evolution API create response:', data);
    
    // Validate that instance was created successfully
    if (!data?.instance?.instanceName && !data?.instanceName) {
      console.error('Invalid response structure:', data);
      throw new Error('Resposta inválida da Evolution API - instância pode não ter sido criada');
    }
    
    // Verify instance status
    try {
      const statusUrl = `${baseUrl}/instance/connectionState/${trimmedName}`;
      console.log('Verifying instance status at:', statusUrl);
      
      const statusResponse = await fetch(statusUrl, {
        method: 'GET',
        headers: {
          'apikey': apiKey,
          'Accept': 'application/json'
        }
      });
      
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        console.log('Instance status verified:', statusData);
      } else {
        console.warn('Could not verify instance status, but creation appears successful');
      }
    } catch (statusError) {
      console.warn('Status verification failed:', statusError);
      // Don't fail the whole operation if status check fails
    }

    return new Response(JSON.stringify({
      success: true,
      data: data
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error creating instance:', error);
    return new Response(JSON.stringify({
      success: false,
      error: (error as Error)?.message || 'Failed to create instance'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});