
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { instanceId, apiKey } = await req.json();

    if (!instanceId || !apiKey) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'instanceId and apiKey are required' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const baseUrl = "https://evolutionapi.workidigital.tech";
    const url = `${baseUrl}/instance/connect/${instanceId}`;

    console.log(`Getting QR code for instance: ${instanceId}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'apikey': apiKey,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Evolution API response:', data);

    // A API pode retornar 'qrcode' (base64) ou 'pairingCode' e 'code' (base64)
    if (data.qrcode) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          qrcode: data.qrcode 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    } else if (data.pairingCode && data.code) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          pairingCode: data.pairingCode,
          code: data.code 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    } else {
      console.error("Unexpected API response:", data);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Unexpected response format from Evolution API' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
  } catch (error: any) {
    console.error('Error getting QR code:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to get QR code' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
