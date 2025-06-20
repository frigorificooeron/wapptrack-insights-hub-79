
import { supabase } from "@/integrations/supabase/client";

export interface DeviceDataCapture {
  ip_address?: string;
  user_agent?: string;
  browser?: string;
  os?: string;
  device_type?: string;
  device_model?: string;
  screen_resolution?: string;
  timezone?: string;
  language?: string;
  country?: string;
  city?: string;
  location?: string;
  phone?: string;
  timestamp: string;
  facebook_ad_id?: string;
  facebook_adset_id?: string;
  facebook_campaign_id?: string;
}

// Função para detectar informações do dispositivo
export const captureDeviceData = async (phone?: string): Promise<DeviceDataCapture> => {
  try {
    console.log('📱 Iniciando captura de dados do dispositivo...');
    
    const deviceData: DeviceDataCapture = {
      timestamp: new Date().toISOString(),
      phone: phone
    };

    // Capturar informações básicas do navegador
    if (typeof window !== 'undefined' && navigator) {
      deviceData.user_agent = navigator.userAgent;
      deviceData.language = navigator.language;
      
      // Detectar sistema operacional
      const userAgent = navigator.userAgent.toLowerCase();
      if (userAgent.includes('windows')) deviceData.os = 'Windows';
      else if (userAgent.includes('mac')) deviceData.os = 'MacOS';
      else if (userAgent.includes('linux')) deviceData.os = 'Linux';
      else if (userAgent.includes('android')) deviceData.os = 'Android';
      else if (userAgent.includes('ios') || userAgent.includes('iphone') || userAgent.includes('ipad')) deviceData.os = 'iOS';
      
      // Detectar navegador
      if (userAgent.includes('chrome') && !userAgent.includes('edg')) deviceData.browser = 'Chrome';
      else if (userAgent.includes('firefox')) deviceData.browser = 'Firefox';
      else if (userAgent.includes('safari') && !userAgent.includes('chrome')) deviceData.browser = 'Safari';
      else if (userAgent.includes('edg')) deviceData.browser = 'Edge';
      
      // Detectar tipo de dispositivo
      if (/tablet|ipad/i.test(userAgent)) {
        deviceData.device_type = 'Tablet';
        deviceData.device_model = 'tablet';
      } else if (/mobile|android|iphone/i.test(userAgent)) {
        deviceData.device_type = 'Mobile';
        deviceData.device_model = 'mobile';
      } else {
        deviceData.device_type = 'Desktop';
        deviceData.device_model = 'desktop';
      }
    }

    // Capturar resolução da tela
    if (typeof window !== 'undefined' && screen) {
      deviceData.screen_resolution = `${screen.width}x${screen.height}`;
    }

    // Capturar timezone
    if (typeof Intl !== 'undefined') {
      deviceData.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    }

    // Tentar capturar IP e localização via API externa (opcional)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch('https://ipapi.co/json/', { 
        method: 'GET',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const locationData = await response.json();
        deviceData.ip_address = locationData.ip;
        deviceData.country = locationData.country_name;
        deviceData.city = locationData.city;
        deviceData.location = `${locationData.city || 'Unknown'}, ${locationData.country_name || 'Unknown'}`;
      }
    } catch (error) {
      console.log('⚠️ Não foi possível capturar dados de localização:', error);
    }

    console.log('✅ Dados do dispositivo capturados:', deviceData);
    return deviceData;
    
  } catch (error) {
    console.error('❌ Erro ao capturar dados do dispositivo:', error);
    return {
      timestamp: new Date().toISOString(),
      phone: phone
    };
  }
};

// Função para salvar dados do dispositivo associados a um lead
export const saveDeviceData = async (deviceData: DeviceDataCapture): Promise<void> => {
  try {
    if (!deviceData.phone) {
      console.log('⚠️ Telefone não fornecido, não salvando dados do dispositivo');
      return;
    }

    console.log('💾 Salvando dados do dispositivo para:', deviceData.phone);
    
    // Primeiro, verificar se já existe um lead com este telefone
    const { data: existingLead, error: searchError } = await supabase
      .from('leads')
      .select('id')
      .eq('phone', deviceData.phone)
      .single();

    if (searchError && searchError.code !== 'PGRST116') {
      console.error('Erro ao buscar lead existente:', searchError);
      throw searchError;
    }

    if (existingLead) {
      // Atualizar lead existente com dados do dispositivo
      const { error: updateError } = await supabase
        .from('leads')
        .update({
          ip_address: deviceData.ip_address,
          browser: deviceData.browser,
          os: deviceData.os,
          device_type: deviceData.device_type,
          device_model: deviceData.device_model,
          screen_resolution: deviceData.screen_resolution,
          timezone: deviceData.timezone,
          language: deviceData.language,
          country: deviceData.country,
          city: deviceData.city,
          location: deviceData.location,
          facebook_ad_id: deviceData.facebook_ad_id,
          facebook_adset_id: deviceData.facebook_adset_id,
          facebook_campaign_id: deviceData.facebook_campaign_id,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingLead.id);

      if (updateError) {
        console.error('Erro ao atualizar lead com dados do dispositivo:', updateError);
        throw updateError;
      }

      console.log('✅ Lead atualizado com dados do dispositivo');
    } else {
      console.log('ℹ️ Lead não encontrado, dados serão salvos quando o lead for criado');
    }
    
  } catch (error) {
    console.error('❌ Erro ao salvar dados do dispositivo:', error);
    throw error;
  }
};

// Função para buscar dados de dispositivo por telefone
export const getDeviceDataByPhone = async (phone: string): Promise<DeviceDataCapture | null> => {
  try {
    const { data: lead, error } = await supabase
      .from('leads')
      .select('ip_address, browser, os, device_type, device_model, screen_resolution, timezone, language, country, city, location, phone, created_at, facebook_ad_id, facebook_adset_id, facebook_campaign_id')
      .eq('phone', phone)
      .single();

    if (error) {
      console.error('Erro ao buscar dados do dispositivo:', error);
      return null;
    }

    if (!lead) return null;

    return {
      ip_address: lead.ip_address,
      browser: lead.browser,
      os: lead.os,
      device_type: lead.device_type,
      device_model: lead.device_model,
      screen_resolution: lead.screen_resolution,
      timezone: lead.timezone,
      language: lead.language,
      country: lead.country,
      city: lead.city,
      location: lead.location,
      phone: lead.phone,
      timestamp: lead.created_at,
      facebook_ad_id: lead.facebook_ad_id,
      facebook_adset_id: lead.facebook_adset_id,
      facebook_campaign_id: lead.facebook_campaign_id
    };
    
  } catch (error) {
    console.error('Erro ao buscar dados do dispositivo:', error);
    return null;
  }
};
