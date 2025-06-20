import { supabase } from '../integrations/supabase/client';

export interface SharedAccessPermissions {
  dashboard?: {
    view: boolean;
    edit: boolean;
  };
  leads?: {
    view: boolean;
    edit: boolean;
  };
  campaigns?: {
    view: boolean;
    edit: boolean;
  };
  sales?: {
    view: boolean;
    edit: boolean;
  };
  settings?: {
    view: boolean;
    edit: boolean;
  };
}

export interface SharedAccessToken {
  id: string;
  token: string;
  name: string;
  description?: string;
  permissions: SharedAccessPermissions;
  created_at: string;
  expires_at?: string;
  is_active: boolean;
}

export interface CreateTokenRequest {
  name: string;
  description?: string;
  permissions: SharedAccessPermissions;
  expires_at?: string;
}

export class SharedAccessService {
  /**
   * Create a new shared access token
   */
  static async createToken(data: CreateTokenRequest): Promise<SharedAccessToken> {
    const { data: result, error } = await supabase.rpc('create_shared_access_token', {
      p_name: data.name,
      p_description: data.description,
      p_permissions: data.permissions,
      p_expires_at: data.expires_at,
    });

    if (error) {
      throw new Error(`Failed to create shared access token: ${error.message}`);
    }

    if (!result || result.length === 0) {
      throw new Error('No token was created');
    }

    return result[0];
  }

  /**
   * Get all tokens created by the current user
   */
  static async getUserTokens(): Promise<SharedAccessToken[]> {
    const { data, error } = await supabase
      .from('shared_access_tokens')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch tokens: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Validate a token and get its permissions
   */
  static async validateToken(token: string): Promise<{
    id: string;
    permissions: SharedAccessPermissions;
    name: string;
    description?: string;
    created_at: string;
    expires_at?: string;
  } | null> {
    const { data, error } = await supabase.rpc('get_token_permissions', {
      p_token: token,
    });

    if (error) {
      console.error('Token validation error:', error);
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    return data[0];
  }

  /**
   * Deactivate a token
   */
  static async deactivateToken(tokenId: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('deactivate_shared_token', {
      p_token_id: tokenId,
    });

    if (error) {
      throw new Error(`Failed to deactivate token: ${error.message}`);
    }

    return data === true;
  }

  /**
   * Update token permissions
   */
  static async updateToken(
    tokenId: string,
    updates: Partial<Pick<SharedAccessToken, 'name' | 'description' | 'permissions' | 'expires_at'>>
  ): Promise<void> {
    const { error } = await supabase
      .from('shared_access_tokens')
      .update(updates)
      .eq('id', tokenId);

    if (error) {
      throw new Error(`Failed to update token: ${error.message}`);
    }
  }

  /**
   * Generate a shareable URL for a token
   */
  static generateShareableUrl(token: string, baseUrl?: string): string {
    const base = baseUrl || window.location.origin;
    return `${base}/shared/${token}`;
  }
}

