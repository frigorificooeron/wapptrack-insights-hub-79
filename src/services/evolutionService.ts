import { supabase } from '@/integrations/supabase/client';

export interface QRCodeResponse {
  success: boolean;
  qrcode?: string; // Agora este campo conterá a string base64 completa (com prefixo data:image/png;base64,)
  pairingCode?: string;
  error?: string;
}

export interface InstanceStatusResponse {
  success: boolean;
  status?: 'open' | 'close' | 'connecting' | 'qrcode' | 'disconnected';
  error?: string;
}

export const evolutionService = {
  async getQRCode(instanceId: string): Promise<QRCodeResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('evolution-qrcode', {
        body: {
          instanceId
        }
      });

      if (error) {
        throw error;
      }

      return data;
    } catch (error: any) {
      console.error('Error getting QR code:', error);
      return {
        success: false,
        error: error.message || 'Failed to get QR code'
      };
    }
  },

  async getInstanceStatus(instanceId: string): Promise<InstanceStatusResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('evolution-status', {
        body: {
          instanceId
        }
      });

      if (error) {
        throw error;
      }

      return data;
    } catch (error: any) {
      console.error('Error getting instance status:', error);
      return {
        success: false,
        error: error.message || 'Failed to get instance status'
      };
    }
  }
};


