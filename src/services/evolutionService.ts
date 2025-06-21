
import { supabase } from '@/integrations/supabase/client';

export interface QRCodeResponse {
  success: boolean;
  qrcode?: string;
  pairingCode?: string;
  code?: string;
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
  }
};
