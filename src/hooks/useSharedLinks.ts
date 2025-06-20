
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useSharedLinks = () => {
  const [sharedLinks, setSharedLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSharedLinks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('shared_links')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading shared links:', error);
        toast.error('Erro ao carregar links compartilhados');
        return;
      }

      setSharedLinks(data || []);
    } catch (error) {
      console.error('Error loading shared links:', error);
      toast.error('Erro ao carregar links compartilhados');
    } finally {
      setLoading(false);
    }
  };

  const generateToken = () => {
    return Math.random().toString(36).substr(2, 9) + 
           Math.random().toString(36).substr(2, 9);
  };

  const createSharedLink = async (linkData: {
    name: string;
    expiresAt: string;
    permissions: any;
  }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const token = generateToken();
      const { data, error } = await supabase
        .from('shared_links')
        .insert({
          user_id: user.id,
          token,
          name: linkData.name,
          expires_at: linkData.expiresAt || null,
          permissions: linkData.permissions
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating shared link:', error);
        throw error;
      }

      setSharedLinks(prev => [data, ...prev]);
      return data;
    } catch (error) {
      console.error('Error creating shared link:', error);
      throw error;
    }
  };

  const updateSharedLink = async (id: string, updates: any) => {
    try {
      const { data, error } = await supabase
        .from('shared_links')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating shared link:', error);
        throw error;
      }

      setSharedLinks(prev => 
        prev.map(link => link.id === id ? data : link)
      );
      return data;
    } catch (error) {
      console.error('Error updating shared link:', error);
      throw error;
    }
  };

  const deleteSharedLink = async (id: string) => {
    try {
      const { error } = await supabase
        .from('shared_links')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting shared link:', error);
        toast.error('Erro ao deletar link');
        return;
      }

      setSharedLinks(prev => prev.filter(link => link.id !== id));
      toast.success('Link deletado com sucesso');
    } catch (error) {
      console.error('Error deleting shared link:', error);
      toast.error('Erro ao deletar link');
    }
  };

  const getSharedLinkByToken = async (token: string) => {
    try {
      const { data, error } = await supabase
        .from('shared_links')
        .select('*')
        .eq('token', token)
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('Error getting shared link:', error);
        return null;
      }

      // Verificar se o link não expirou
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error getting shared link:', error);
      return null;
    }
  };

  useEffect(() => {
    loadSharedLinks();
  }, []);

  return {
    sharedLinks,
    loading,
    createSharedLink,
    updateSharedLink,
    deleteSharedLink,
    getSharedLinkByToken,
    loadSharedLinks
  };
};
