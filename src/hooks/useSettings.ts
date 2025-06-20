
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useTheme } from '@/hooks/useTheme';
import type { CompanySettings, Theme } from '@/types';

export const useSettings = () => {
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { theme, setTheme } = useTheme();
  
  const [formData, setFormData] = useState({
    company_name: '',
    company_subtitle: '',
    logo_url: '',
    theme: theme as Theme
  });

  const loadSettings = async () => {
    try {
      // Usar order by e limit para pegar apenas a primeira configuração
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error loading settings:', error);
      }

      if (data) {
        const typedData: CompanySettings = {
          ...data,
          theme: (data.theme as Theme) || 'system'
        };
        setSettings(typedData);
        setFormData({
          company_name: data.company_name || '',
          company_subtitle: data.company_subtitle || '',
          logo_url: data.logo_url || '',
          theme: (data.theme as Theme) || 'system'
        });
        
        // Apply saved theme
        if (data.theme) {
          setTheme(data.theme as Theme);
        }
      } else {
        setFormData({
          company_name: 'Sua Empresa',
          company_subtitle: 'Sistema de Marketing',
          logo_url: '',
          theme: 'system' as Theme
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    setFormData(prev => ({
      ...prev,
      theme: newTheme
    }));
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('Você deve selecionar uma imagem para upload.');
      }

      const file = event.target.files[0];
      
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('O arquivo deve ter no máximo 5MB.');
      }

      if (!file.type.startsWith('image/')) {
        throw new Error('Por favor, selecione apenas arquivos de imagem.');
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;
      const filePath = fileName;

      const { error: uploadError } = await supabase.storage
        .from('company-logos')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage
        .from('company-logos')
        .getPublicUrl(filePath);

      setFormData(prev => ({
        ...prev,
        logo_url: data.publicUrl
      }));

      toast.success('Logo enviada com sucesso!');
    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast.error(error.message || 'Erro ao enviar logo');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);

      if (!formData.company_name.trim()) {
        toast.error('O nome da empresa é obrigatório');
        return;
      }

      const updateData = {
        company_name: formData.company_name.trim(),
        company_subtitle: formData.company_subtitle.trim(),
        logo_url: formData.logo_url,
        theme: formData.theme,
        updated_at: new Date().toISOString()
      };

      // Usar upsert (INSERT ... ON CONFLICT DO UPDATE) para evitar problemas de constraint
      const { data, error } = await supabase
        .from('company_settings')
        .upsert([updateData], {
          onConflict: 'user_id',
          ignoreDuplicates: false
        })
        .select();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Settings saved successfully:', data);
      toast.success('Configurações salvas com sucesso!');
      
      await loadSettings();
      
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast.error(error.message || 'Erro ao salvar configurações');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  return {
    settings,
    loading,
    uploading,
    formData,
    handleInputChange,
    handleThemeChange,
    handleFileUpload,
    handleSave
  };
};
