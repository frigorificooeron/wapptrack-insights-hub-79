
import { Sale } from "../types";
import { supabase } from "../integrations/supabase/client";

export const getSales = async (): Promise<Sale[]> => {
  try {
    const { data: sales, error } = await supabase
      .from('sales')
      .select('*')
      .order('sale_date', { ascending: false });

    if (error) throw error;

    // 🆕 MAPEAR DADOS EXPANDIDOS DAS VENDAS
    return (sales || []).map(sale => ({
      id: sale.id,
      value: sale.amount || 0,
      date: sale.sale_date || sale.created_at,
      lead_name: '', // This needs to be populated from leads table if needed
      campaign: sale.campaign_id || '',
      product: '',
      notes: sale.notes || '',
      lead_id: sale.lead_id || '',
      status: (sale.status as 'confirmed' | 'pending' | 'cancelled') || 'confirmed',
      created_at: sale.created_at,
      updated_at: sale.updated_at,
      // 🆕 INCLUIR CAMPOS PRESERVADOS DO LEAD
      custom_fields: sale.custom_fields || {},
      utm_source: sale.custom_fields?.lead_data?.utm_source || '',
      utm_medium: sale.custom_fields?.lead_data?.utm_medium || '',
      utm_campaign: sale.custom_fields?.lead_data?.utm_campaign || '',
      utm_content: sale.custom_fields?.lead_data?.utm_content || '',
      utm_term: sale.custom_fields?.lead_data?.utm_term || '',
      ad_account: sale.custom_fields?.lead_data?.ad_account || '',
      ad_set_name: sale.custom_fields?.lead_data?.ad_set_name || '',
      ad_name: sale.custom_fields?.lead_data?.ad_name || '',
      tracking_method: sale.custom_fields?.lead_data?.tracking_method || '',
      device_type: sale.custom_fields?.lead_data?.device_type || '',
      location: sale.custom_fields?.lead_data?.location || ''
    }));
  } catch (error) {
    console.error("Error fetching sales:", error);
    return [];
  }
};

export const addSale = async (sale: Omit<Sale, 'id' | 'created_at' | 'updated_at'>): Promise<Sale> => {
  try {
    // 🆕 PREPARAR DADOS COM CAMPOS EXPANDIDOS
    const saleData = {
      amount: sale.value,
      sale_date: sale.date,
      status: sale.status || 'confirmed',
      notes: sale.notes,
      lead_id: sale.lead_id || null,
      campaign_id: sale.campaign || null,
      // 🆕 PRESERVAR CUSTOM_FIELDS COM DADOS DO LEAD
      custom_fields: sale.custom_fields || {}
    };

    console.log('💾 [SALE SERVICE] Criando venda com dados expandidos:', saleData);

    const { data, error } = await supabase
      .from('sales')
      .insert(saleData)
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      value: data.amount,
      date: data.sale_date,
      lead_name: sale.lead_name || '',
      campaign: sale.campaign || '',
      product: sale.product || '',
      notes: data.notes,
      lead_id: data.lead_id,
      status: (data.status as 'confirmed' | 'pending' | 'cancelled') || 'confirmed',
      created_at: data.created_at,
      updated_at: data.updated_at,
      // 🆕 INCLUIR CAMPOS PRESERVADOS
      custom_fields: data.custom_fields || {},
      utm_source: sale.utm_source || '',
      utm_medium: sale.utm_medium || '',
      utm_campaign: sale.utm_campaign || '',
      utm_content: sale.utm_content || '',
      utm_term: sale.utm_term || '',
      ad_account: sale.ad_account || '',
      ad_set_name: sale.ad_set_name || '',
      ad_name: sale.ad_name || '',
      tracking_method: sale.tracking_method || '',
      device_type: sale.device_type || '',
      location: sale.location || ''
    };
  } catch (error) {
    console.error("Error adding sale:", error);
    throw error;
  }
};

export const updateSale = async (id: string, sale: Partial<Sale>): Promise<Sale> => {
  try {
    const updateData: any = {};
    if (sale.value !== undefined) updateData.amount = sale.value;
    if (sale.date !== undefined) updateData.sale_date = sale.date;
    if (sale.status !== undefined) updateData.status = sale.status;
    if (sale.notes !== undefined) updateData.notes = sale.notes;
    if (sale.lead_id !== undefined) updateData.lead_id = sale.lead_id;
    if (sale.campaign !== undefined) updateData.campaign_id = sale.campaign;
    if (sale.custom_fields !== undefined) updateData.custom_fields = sale.custom_fields;

    const { data, error } = await supabase
      .from('sales')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      value: data.amount,
      date: data.sale_date,
      lead_name: sale.lead_name || '',
      campaign: sale.campaign || '',
      product: sale.product || '',
      notes: data.notes,
      lead_id: data.lead_id,
      status: (data.status as 'confirmed' | 'pending' | 'cancelled') || 'confirmed',
      created_at: data.created_at,
      updated_at: data.updated_at,
      custom_fields: data.custom_fields || {},
      utm_source: data.custom_fields?.lead_data?.utm_source || '',
      utm_medium: data.custom_fields?.lead_data?.utm_medium || '',
      utm_campaign: data.custom_fields?.lead_data?.utm_campaign || '',
      utm_content: data.custom_fields?.lead_data?.utm_content || '',
      utm_term: data.custom_fields?.lead_data?.utm_term || '',
      ad_account: data.custom_fields?.lead_data?.ad_account || '',
      ad_set_name: data.custom_fields?.lead_data?.ad_set_name || '',
      ad_name: data.custom_fields?.lead_data?.ad_name || '',
      tracking_method: data.custom_fields?.lead_data?.tracking_method || '',
      device_type: data.custom_fields?.lead_data?.device_type || '',
      location: data.custom_fields?.lead_data?.location || ''
    };
  } catch (error) {
    console.error("Error updating sale:", error);
    throw error;
  }
};

export const deleteSale = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('sales')
      .delete()
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error("Error deleting sale:", error);
    throw error;
  }
};
