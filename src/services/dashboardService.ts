import { supabase } from "../integrations/supabase/client";
import { Lead, Sale } from "../types";

export const getDashboardStats = async () => {
  try {
    // Get leads count
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('*');

    if (leadsError) throw leadsError;

    // Get sales with amount instead of value
    const { data: sales, error: salesError } = await supabase
      .from('sales')
      .select('amount');

    if (salesError) throw salesError;

    const totalLeads = leads?.length || 0;
    const totalSales = sales?.length || 0;
    const totalRevenue = sales?.reduce((sum, sale) => sum + (sale.amount || 0), 0) || 0;

    return {
      totalLeads,
      totalSales,
      totalRevenue,
      conversionRate: totalLeads > 0 ? (totalSales / totalLeads) * 100 : 0
    };
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return {
      totalLeads: 0,
      totalSales: 0,
      totalRevenue: 0,
      conversionRate: 0
    };
  }
};

export const getDashboardStatsByPeriod = async (startDate: string, endDate: string) => {
  try {
    // Get leads for period
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('*')
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (leadsError) throw leadsError;

    // Get sales for period with amount instead of value
    const { data: sales, error: salesError } = await supabase
      .from('sales')
      .select('amount')
      .gte('sale_date', startDate)
      .lte('sale_date', endDate);

    if (salesError) throw salesError;

    const totalLeads = leads?.length || 0;
    const totalSales = sales?.length || 0;
    const totalRevenue = sales?.reduce((sum, sale) => sum + (sale.amount || 0), 0) || 0;

    return {
      totalLeads,
      totalSales,
      totalRevenue,
      conversionRate: totalLeads > 0 ? (totalSales / totalLeads) * 100 : 0
    };
  } catch (error) {
    console.error("Error fetching dashboard stats by period:", error);
    return {
      totalLeads: 0,
      totalSales: 0,
      totalRevenue: 0,
      conversionRate: 0
    };
  }
};

export const getCampaignPerformance = async () => {
  try {
    const { data: leads, error } = await supabase
      .from('leads')
      .select('campaign');

    if (error) throw error;

    const campaignCounts = leads?.reduce((acc, lead) => {
      const campaign = lead.campaign || 'Unknown';
      acc[campaign] = (acc[campaign] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    return Object.entries(campaignCounts).map(([name, leads]) => ({
      name,
      leads,
      conversions: 0 // Placeholder since we don't have conversion tracking yet
    }));
  } catch (error) {
    console.error("Error fetching campaign performance:", error);
    return [];
  }
};

export const getMonthlyStats = async () => {
  try {
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('created_at');

    if (leadsError) throw leadsError;

    const { data: sales, error: salesError } = await supabase
      .from('sales')
      .select('sale_date, amount');

    if (salesError) throw salesError;

    // Process monthly data
    const monthlyData: { [key: string]: { leads: number; sales: number; revenue: number } } = {};

    leads?.forEach(lead => {
      const month = new Date(lead.created_at).toISOString().slice(0, 7);
      if (!monthlyData[month]) {
        monthlyData[month] = { leads: 0, sales: 0, revenue: 0 };
      }
      monthlyData[month].leads++;
    });

    sales?.forEach(sale => {
      const month = new Date(sale.sale_date).toISOString().slice(0, 7);
      if (!monthlyData[month]) {
        monthlyData[month] = { leads: 0, sales: 0, revenue: 0 };
      }
      monthlyData[month].sales++;
      monthlyData[month].revenue += sale.amount || 0;
    });

    return Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month,
        ...data
      }));
  } catch (error) {
    console.error("Error fetching monthly stats:", error);
    return [];
  }
};

export const getTimelineData = async () => {
  try {
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('created_at, name, campaign')
      .order('created_at', { ascending: false })
      .limit(10);

    if (leadsError) throw leadsError;

    const { data: sales, error: salesError } = await supabase
      .from('sales')
      .select('sale_date, amount')
      .order('sale_date', { ascending: false })
      .limit(10);

    if (salesError) throw salesError;

    const timeline = [
      ...(leads?.map(lead => ({
        type: 'lead' as const,
        date: lead.created_at,
        description: `Novo lead: ${lead.name} (${lead.campaign})`
      })) || []),
      ...(sales?.map(sale => ({
        type: 'sale' as const,
        date: sale.sale_date,
        description: `Venda realizada: R$ ${sale.amount?.toFixed(2) || '0.00'}`
      })) || [])
    ];

    return timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (error) {
    console.error("Error fetching timeline data:", error);
    return [];
  }
};
