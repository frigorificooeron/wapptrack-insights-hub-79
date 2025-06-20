
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
      value: sale.amount,
      date: sale.sale_date || sale.created_at,
      lead_id: sale.lead_id,
      lead_name: '', // This would need to be joined from leads table
      campaign: '', // This would need to be joined from campaigns table
      product: '', // Not available in current schema
      notes: sale.notes
    }));
  } catch (error) {
    console.error("Error fetching sales:", error);
    return [];
  }
};

export const addSale = async (sale: Omit<Sale, 'id'>): Promise<Sale> => {
  try {
    const { data, error } = await supabase
      .from('sales')
      .insert({
        amount: sale.value,
        sale_date: sale.date,
        lead_id: sale.lead_id,
        campaign_id: null, // Map from campaign name if needed
        notes: sale.notes
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      value: data.amount,
      date: data.sale_date || data.created_at,
      lead_id: data.lead_id,
      lead_name: sale.lead_name,
      campaign: sale.campaign,
      product: sale.product,
      notes: data.notes
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
    if (sale.date) updateData.sale_date = sale.date;
    if (sale.lead_id) updateData.lead_id = sale.lead_id;
    if (sale.notes !== undefined) updateData.notes = sale.notes;

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
      date: data.sale_date || data.created_at,
      lead_id: data.lead_id,
      lead_name: sale.lead_name || '',
      campaign: sale.campaign || '',
      product: sale.product || '',
      notes: data.notes
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
