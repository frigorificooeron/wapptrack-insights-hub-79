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
    
    if (!instanceName) {
      return new Response(JSON.stringify({
        success: false,
        error: 'instanceName is required'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

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

    const baseUrl = "https://evolutionapi.workidigital.tech";
    const url = `${baseUrl}/instance/create`;
    
    console.log(`Creating instance: ${instanceName}`);
    
    const requestBody = {
      instanceName: instanceName,
      token: apiKey,
      qrcode: true,
      webhook: webhook || `https://bwicygxyhkdgrypqrijo.supabase.co/functions/v1/evolution-webhook`
    };

    console.log('Request payload:', JSON.stringify(requestBody, null, 2));
    console.log('API Key length:', apiKey?.length || 'undefined');
    console.log('Base URL:', baseUrl);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'apikey': apiKey,
        'Content-Type': 'application/json'
      },
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
      
      if (data?.message) {
        detailedError += ` - ${data.message}`;
      } else if (data?.error) {
        detailedError += ` - ${data.error}`;
      } else if (errorMessage) {
        detailedError += ` - ${errorMessage}`;
      }
      
      throw new Error(detailedError);
    }
    console.log('Evolution API create response:', data);

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
      error: error.message || 'Failed to create instance'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});