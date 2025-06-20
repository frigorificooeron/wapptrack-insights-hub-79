
import { supabase } from "@/integrations/supabase/client";
import { DashboardStats, CampaignPerformance, TimelineDataPoint, MonthlyStats } from "../types";

export const getDashboardStats = async (): Promise<DashboardStats> => {
  try {
    // Get basic counts
    const { data: leads } = await supabase.from('leads').select('*');
    const { data: sales } = await supabase.from('sales').select('*');
    
    const totalLeads = leads?.length || 0;
    const totalSales = sales?.length || 0;
    const totalRevenue = sales?.reduce((sum, sale) => sum + (sale.amount || 0), 0) || 0;
    
    // Today's stats
    const today = new Date().toISOString().split('T')[0];
    const todaysLeads = leads?.filter(lead => 
      lead.created_at?.startsWith(today)
    ).length || 0;
    
    const confirmedSales = sales?.filter(sale => 
      sale.status === 'confirmed'
    ).length || 0;
    
    const pendingConversations = leads?.filter(lead => 
      lead.status === 'new' || lead.status === 'contacted'
    ).length || 0;
    
    // Monthly stats
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const monthlyLeads = leads?.filter(lead => {
      const leadDate = new Date(lead.created_at);
      return leadDate.getMonth() === currentMonth && leadDate.getFullYear() === currentYear;
    }).length || 0;
    
    const monthlyRevenue = sales?.filter(sale => {
      const saleDate = new Date(sale.sale_date || sale.created_at);
      return saleDate.getMonth() === currentMonth && saleDate.getFullYear() === currentYear;
    }).reduce((sum, sale) => sum + (sale.amount || 0), 0) || 0;
    
    const conversionRate = totalLeads > 0 ? (totalSales / totalLeads) * 100 : 0;
    
    return {
      totalLeads,
      totalSales,
      conversionRate,
      totalRevenue,
      todaysLeads,
      confirmedSales,
      pendingConversations,
      monthlyLeads,
      monthlyRevenue
    };
  } catch (error) {
    console.error("Error getting dashboard stats:", error);
    return {
      totalLeads: 0,
      totalSales: 0,
      conversionRate: 0,
      totalRevenue: 0,
      todaysLeads: 0,
      confirmedSales: 0,
      pendingConversations: 0,
      monthlyLeads: 0,
      monthlyRevenue: 0
    };
  }
};

export const getCampaignPerformance = async (): Promise<CampaignPerformance[]> => {
  try {
    const { data: campaigns } = await supabase.from('campaigns').select('*');
    const { data: leads } = await supabase.from('leads').select('*');
    const { data: sales } = await supabase.from('sales').select('*');
    
    return (campaigns || []).map(campaign => {
      const campaignLeads = leads?.filter(lead => 
        lead.campaign_id === campaign.id || lead.campaign === campaign.name
      ) || [];
      
      const campaignSales = sales?.filter(sale =>
        campaignLeads.some(lead => lead.id === sale.lead_id)
      ) || [];
      
      const revenue = campaignSales.reduce((sum, sale) => sum + (sale.amount || 0), 0);
      const conversionRate = campaignLeads.length > 0 ? 
        (campaignSales.length / campaignLeads.length) * 100 : 0;
      
      return {
        campaignId: campaign.id,
        campaignName: campaign.name,
        leads: campaignLeads.length,
        sales: campaignSales.length,
        revenue,
        conversionRate
      };
    });
  } catch (error) {
    console.error("Error getting campaign performance:", error);
    return [];
  }
};

export const getTimelineData = async (days: number = 30): Promise<TimelineDataPoint[]> => {
  try {
    const { data: leads } = await supabase.from('leads').select('*');
    const { data: sales } = await supabase.from('sales').select('*');
    
    const timeline: TimelineDataPoint[] = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayLeads = leads?.filter(lead => 
        lead.created_at?.startsWith(dateStr)
      ).length || 0;
      
      const daySales = sales?.filter(sale => {
        const saleDate = sale.sale_date || sale.created_at;
        return saleDate?.startsWith(dateStr);
      }) || [];
      
      const dayRevenue = daySales.reduce((sum, sale) => sum + (sale.amount || 0), 0);
      
      timeline.push({
        date: dateStr,
        leads: dayLeads,
        sales: daySales.length,
        revenue: dayRevenue
      });
    }
    
    return timeline;
  } catch (error) {
    console.error("Error getting timeline data:", error);
    return [];
  }
};

export const getMonthlyStats = async (): Promise<MonthlyStats> => {
  try {
    const { data: leads } = await supabase.from('leads').select('*');
    const { data: sales } = await supabase.from('sales').select('*');
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    
    const currentMonthLeads = leads?.filter(lead => {
      const leadDate = new Date(lead.created_at);
      return leadDate.getMonth() === currentMonth && leadDate.getFullYear() === currentYear;
    }).length || 0;
    
    const previousMonthLeads = leads?.filter(lead => {
      const leadDate = new Date(lead.created_at);
      return leadDate.getMonth() === previousMonth && leadDate.getFullYear() === previousYear;
    }).length || 0;
    
    const currentMonthRevenue = sales?.filter(sale => {
      const saleDate = new Date(sale.sale_date || sale.created_at);
      return saleDate.getMonth() === currentMonth && saleDate.getFullYear() === currentYear;
    }).reduce((sum, sale) => sum + (sale.amount || 0), 0) || 0;
    
    const previousMonthRevenue = sales?.filter(sale => {
      const saleDate = new Date(sale.sale_date || sale.created_at);
      return saleDate.getMonth() === previousMonth && saleDate.getFullYear() === previousYear;
    }).reduce((sum, sale) => sum + (sale.amount || 0), 0) || 0;
    
    return {
      currentMonth: {
        leads: currentMonthLeads,
        revenue: currentMonthRevenue
      },
      previousMonth: {
        leads: previousMonthLeads,
        revenue: previousMonthRevenue
      }
    };
  } catch (error) {
    console.error("Error getting monthly stats:", error);
    return {
      currentMonth: { leads: 0, revenue: 0 },
      previousMonth: { leads: 0, revenue: 0 }
    };
  }
};
