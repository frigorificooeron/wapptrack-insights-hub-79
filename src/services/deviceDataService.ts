
import { supabase } from '@/integrations/supabase/client';

export interface DeviceData {
  id: string;
  lead_id: string;
  browser?: string;
  os?: string;
  device_type?: string;
  device_model?: string;
  screen_resolution?: string;
  ip_address?: string;
  location?: string;
  timezone?: string;
  language?: string;
  created_at: string;
}

export interface DeviceDataCapture {
  browser?: string;
  os?: string;
  device_type?: string;
  device_model?: string;
  screen_resolution?: string;
  ip_address?: string;
  location?: string;
  timezone?: string;
  language?: string;
  country?: string;
  city?: string;
  facebook_ad_id?: string;
  facebook_adset_id?: string;
  facebook_campaign_id?: string;
}

interface CollectDeviceDataParams {
  leadId: string;
  userAgent?: string;
  screenResolution?: string;
  timezone?: string;
  language?: string;
  ipAddress?: string;
  location?: string;
}

// Parse user agent to extract browser and OS info
const parseUserAgent = (userAgent: string) => {
  const browser = getBrowserName(userAgent);
  const os = getOSName(userAgent);
  const deviceType = getDeviceType(userAgent);
  const deviceModel = getDeviceModel(userAgent);
  
  return { browser, os, deviceType, deviceModel };
};

const getBrowserName = (userAgent: string): string => {
  if (userAgent.includes('Chrome')) return 'Chrome';
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Safari')) return 'Safari';
  if (userAgent.includes('Edge')) return 'Edge';
  if (userAgent.includes('Opera')) return 'Opera';
  return 'Unknown';
};

const getOSName = (userAgent: string): string => {
  if (userAgent.includes('Windows')) return 'Windows';
  if (userAgent.includes('Mac OS')) return 'macOS';
  if (userAgent.includes('Linux')) return 'Linux';
  if (userAgent.includes('Android')) return 'Android';
  if (userAgent.includes('iOS')) return 'iOS';
  return 'Unknown';
};

const getDeviceType = (userAgent: string): string => {
  if (userAgent.includes('Mobile')) return 'Mobile';
  if (userAgent.includes('Tablet')) return 'Tablet';
  return 'Desktop';
};

const getDeviceModel = (userAgent: string): string => {
  // Basic device model detection - could be expanded
  if (userAgent.includes('iPhone')) return 'iPhone';
  if (userAgent.includes('iPad')) return 'iPad';
  if (userAgent.includes('Samsung')) return 'Samsung';
  return 'Unknown';
};

export const captureDeviceData = async (phone?: string): Promise<DeviceDataCapture> => {
  const userAgent = navigator.userAgent;
  const deviceInfo = parseUserAgent(userAgent);
  
  return {
    browser: deviceInfo.browser,
    os: deviceInfo.os,
    device_type: deviceInfo.deviceType,
    device_model: deviceInfo.deviceModel,
    screen_resolution: `${screen.width}x${screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language
  };
};

export const saveDeviceData = async (deviceData: DeviceDataCapture): Promise<boolean> => {
  try {
    console.log('💾 Saving device data:', deviceData);
    // For now, just log the data since we don't have a device_data table
    // This data will be attached to leads when they are created
    return true;
  } catch (error) {
    console.error('Error saving device data:', error);
    return false;
  }
};

export const collectDeviceData = async (params: CollectDeviceDataParams): Promise<boolean> => {
  try {
    const deviceInfo = params.userAgent ? parseUserAgent(params.userAgent) : {};
    
    // Store device data in the leads table
    const { error } = await supabase
      .from('leads')
      .update({
        browser: deviceInfo.browser,
        os: deviceInfo.os,
        device_type: deviceInfo.deviceType,
        device_model: deviceInfo.deviceModel,
        screen_resolution: params.screenResolution,
        ip_address: params.ipAddress,
        location: params.location,
        timezone: params.timezone,
        language: params.language
      })
      .eq('id', params.leadId);

    if (error) {
      console.error('Error storing device data:', error);
      return false;
    }

    console.log('Device data collected successfully for lead:', params.leadId);
    return true;
  } catch (error) {
    console.error('Error collecting device data:', error);
    return false;
  }
};

export const getDeviceDataForLead = async (leadId: string): Promise<DeviceData | null> => {
  try {
    const { data, error } = await supabase
      .from('leads')
      .select('id, browser, os, device_type, device_model, screen_resolution, ip_address, location, timezone, language, created_at')
      .eq('id', leadId)
      .single();

    if (error || !data) {
      console.error('Error fetching device data:', error);
      return null;
    }

    return {
      id: data.id,
      lead_id: leadId,
      browser: data.browser,
      os: data.os,
      device_type: data.device_type,
      device_model: data.device_model,
      screen_resolution: data.screen_resolution,
      ip_address: data.ip_address,
      location: data.location,
      timezone: data.timezone,
      language: data.language,
      created_at: data.created_at
    };
  } catch (error) {
    console.error('Error getting device data:', error);
    return null;
  }
};

export const getDeviceDataByPhone = async (phone: string): Promise<DeviceDataCapture | null> => {
  try {
    const { data, error } = await supabase
      .from('leads')
      .select('browser, os, device_type, device_model, screen_resolution, ip_address, location, timezone, language, country, city, facebook_ad_id, facebook_adset_id, facebook_campaign_id')
      .eq('phone', phone)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      console.log('No device data found for phone:', phone);
      return null;
    }

    return {
      browser: data.browser,
      os: data.os,
      device_type: data.device_type,
      device_model: data.device_model,
      screen_resolution: data.screen_resolution,
      ip_address: data.ip_address,
      location: data.location,
      timezone: data.timezone,
      language: data.language,
      country: data.country,
      city: data.city,
      facebook_ad_id: data.facebook_ad_id,
      facebook_adset_id: data.facebook_adset_id,
      facebook_campaign_id: data.facebook_campaign_id
    };
  } catch (error) {
    console.error('Error getting device data by phone:', error);
    return null;
  }
};

export const getAllDeviceData = async (): Promise<DeviceData[]> => {
  try {
    const { data, error } = await supabase
      .from('leads')
      .select('id, browser, os, device_type, device_model, screen_resolution, ip_address, location, timezone, language, created_at')
      .not('browser', 'is', null);

    if (error) {
      console.error('Error fetching all device data:', error);
      return [];
    }

    return (data || []).map(item => ({
      id: item.id,
      lead_id: item.id,
      browser: item.browser,
      os: item.os,
      device_type: item.device_type,
      device_model: item.device_model,
      screen_resolution: item.screen_resolution,
      ip_address: item.ip_address,
      location: item.location,
      timezone: item.timezone,
      language: item.language,
      created_at: item.created_at
    }));
  } catch (error) {
    console.error('Error getting all device data:', error);
    return [];
  }
};

export const getDeviceStats = async () => {
  try {
    const { data, error } = await supabase
      .from('leads')
      .select('browser, os, device_type');

    if (error) {
      console.error('Error fetching device stats:', error);
      return { browsers: {}, operatingSystems: {}, deviceTypes: {} };
    }

    const browsers: { [key: string]: number } = {};
    const operatingSystems: { [key: string]: number } = {};
    const deviceTypes: { [key: string]: number } = {};

    (data || []).forEach(item => {
      if (item.browser) {
        browsers[item.browser] = (browsers[item.browser] || 0) + 1;
      }
      if (item.os) {
        operatingSystems[item.os] = (operatingSystems[item.os] || 0) + 1;
      }
      if (item.device_type) {
        deviceTypes[item.device_type] = (deviceTypes[item.device_type] || 0) + 1;
      }
    });

    return { browsers, operatingSystems, deviceTypes };
  } catch (error) {
    console.error('Error getting device stats:', error);
    return { browsers: {}, operatingSystems: {}, deviceTypes: {} };
  }
};
