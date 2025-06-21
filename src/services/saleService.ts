import { Sale } from "../types";
import { supabase } from "../integrations/supabase/client";

export const getSales = async (): Promise<Sale[]> => {
  try {
    const { data: sales, error } = await supabase
      .from('sales')
      .select('*')
      .order('sale_date', { ascending: false });

    if (error) throw error;

    return (sales || []).map(sale => ({
      id: sale.id,
      amount: sale.amount || 0,
      sale_date: sale.sale_date || sale.created_at,
      status: sale.status || 'confirmed',
      notes: sale.notes || '',
      lead_id: sale.lead_id || '',
      campaign_id: sale.campaign_id || '',
      created_at: sale.created_at,
      updated_at: sale.updated_at
    }));
  } catch (error) {
    console.error("Error fetching sales:", error);
    return [];
  }
};

export const addSale = async (sale: Omit<Sale, 'id' | 'created_at' | 'updated_at'>): Promise<Sale> => {
  try {
    const { data, error } = await supabase
      .from('sales')
      .insert({
        amount: sale.amount,
        sale_date: sale.sale_date,
        status: sale.status,
        notes: sale.notes,
        lead_id: sale.lead_id,
        campaign_id: sale.campaign_id
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      amount: data.amount,
      sale_date: data.sale_date,
      status: data.status,
      notes: data.notes,
      lead_id: data.lead_id,
      campaign_id: data.campaign_id,
      created_at: data.created_at,
      updated_at: data.updated_at
    };
  } catch (error) {
    console.error("Error adding sale:", error);
    throw error;
  }
};

export const updateSale = async (id: string, sale: Partial<Sale>): Promise<Sale> => {
  try {
    const updateData: any = {};
    if (sale.amount !== undefined) updateData.amount = sale.amount;
    if (sale.sale_date !== undefined) updateData.sale_date = sale.sale_date;
    if (sale.status !== undefined) updateData.status = sale.status;
    if (sale.notes !== undefined) updateData.notes = sale.notes;
    if (sale.lead_id !== undefined) updateData.lead_id = sale.lead_id;
    if (sale.campaign_id !== undefined) updateData.campaign_id = sale.campaign_id;

    const { data, error } = await supabase
      .from('sales')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      amount: data.amount,
      sale_date: data.sale_date,
      status: data.status,
      notes: data.notes,
      lead_id: data.lead_id,
      campaign_id: data.campaign_id,
      created_at: data.created_at,
      updated_at: data.updated_at
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
