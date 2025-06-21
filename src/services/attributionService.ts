
import { supabase } from '@/integrations/supabase/client';

interface AttributionData {
  leadId: string;
  campaignId?: string;
  campaignName?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  touchpoints?: TouchPoint[];
  conversionValue?: number;
  createdAt: string;
}

interface TouchPoint {
  timestamp: string;
  source: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
}

interface AttributionReport {
  campaignId: string;
  campaignName: string;
  totalLeads: number;
  totalConversions: number;
  totalRevenue: number;
  conversionRate: number;
  averageOrderValue: number;
  topSources: { [key: string]: number };
  topMediums: { [key: string]: number };
}

export const trackAttribution = async (leadId: string, utmParams: {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
}): Promise<boolean> => {
  try {
    // Update the lead with attribution data
    const { error } = await supabase
      .from('leads')
      .update({
        utm_source: utmParams.source,
        utm_medium: utmParams.medium,
        utm_campaign: utmParams.campaign,
        utm_content: utmParams.content,
        utm_term: utmParams.term
      })
      .eq('id', leadId);

    if (error) {
      console.error('Error tracking attribution:', error);
      return false;
    }

    console.log('Attribution tracked successfully for lead:', leadId);
    return true;
  } catch (error) {
    console.error('Error tracking attribution:', error);
    return false;
  }
};

export const getAttributionData = async (leadId: string): Promise<AttributionData | null> => {
  try {
    const { data: leadData, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (leadError || !leadData) {
      console.error('Error fetching lead attribution data:', leadError);
      return null;
    }

    return {
      leadId: leadData.id,
      campaignId: leadData.campaign_id,
      campaignName: leadData.campaign,
      utmSource: leadData.utm_source,
      utmMedium: leadData.utm_medium,
      utmCampaign: leadData.utm_campaign,
      utmContent: leadData.utm_content,
      utmTerm: leadData.utm_term,
      createdAt: leadData.created_at
    };
  } catch (error) {
    console.error('Error getting attribution data:', error);
    return null;
  }
};

export const generateAttributionReport = async (
  startDate?: string,
  endDate?: string
): Promise<AttributionReport[]> => {
  try {
    // Get leads with attribution data
    let leadsQuery = supabase
      .from('leads')
      .select('*');
    
    if (startDate) {
      leadsQuery = leadsQuery.gte('created_at', startDate);
    }
    if (endDate) {
      leadsQuery = leadsQuery.lte('created_at', endDate);
    }

    const { data: leads, error: leadsError } = await leadsQuery;

    if (leadsError) {
      console.error('Error fetching leads for attribution report:', leadsError);
      return [];
    }

    // Get sales data
    let salesQuery = supabase
      .from('sales')
      .select('*');
    
    if (startDate) {
      salesQuery = salesQuery.gte('sale_date', startDate);
    }
    if (endDate) {
      salesQuery = salesQuery.lte('sale_date', endDate);
    }

    const { data: sales, error: salesError } = await salesQuery;

    if (salesError) {
      console.error('Error fetching sales for attribution report:', salesError);
      return [];
    }

    // Group data by campaign
    const campaignData: { [key: string]: AttributionReport } = {};

    (leads || []).forEach(lead => {
      const campaignId = lead.campaign_id || 'unknown';
      const campaignName = lead.campaign || 'Unknown';

      if (!campaignData[campaignId]) {
        campaignData[campaignId] = {
          campaignId,
          campaignName,
          totalLeads: 0,
          totalConversions: 0,
          totalRevenue: 0,
          conversionRate: 0,
          averageOrderValue: 0,
          topSources: {},
          topMediums: {}
        };
      }

      campaignData[campaignId].totalLeads++;

      // Track sources and mediums
      if (lead.utm_source) {
        campaignData[campaignId].topSources[lead.utm_source] = 
          (campaignData[campaignId].topSources[lead.utm_source] || 0) + 1;
      }
      if (lead.utm_medium) {
        campaignData[campaignId].topMediums[lead.utm_medium] = 
          (campaignData[campaignId].topMediums[lead.utm_medium] || 0) + 1;
      }
    });

    // Add sales data
    (sales || []).forEach(sale => {
      const campaignId = sale.campaign_id || 'unknown';
      
      if (campaignData[campaignId]) {
        campaignData[campaignId].totalConversions++;
        campaignData[campaignId].totalRevenue += sale.amount || 0;
      }
    });

    // Calculate rates
    Object.values(campaignData).forEach(campaign => {
      if (campaign.totalLeads > 0) {
        campaign.conversionRate = (campaign.totalConversions / campaign.totalLeads) * 100;
      }
      if (campaign.totalConversions > 0) {
        campaign.averageOrderValue = campaign.totalRevenue / campaign.totalConversions;
      }
    });

    return Object.values(campaignData);
  } catch (error) {
    console.error('Error generating attribution report:', error);
    return [];
  }
};

export const getTopPerformingChannels = async (limit: number = 10) => {
  try {
    const { data: leads, error } = await supabase
      .from('leads')
      .select('utm_source, utm_medium')
      .not('utm_source', 'is', null);

    if (error) {
      console.error('Error fetching leads for channel performance:', error);
      return [];
    }

    const channelPerformance: { [key: string]: number } = {};

    (leads || []).forEach(lead => {
      const channel = `${lead.utm_source || 'unknown'} / ${lead.utm_medium || 'unknown'}`;
      channelPerformance[channel] = (channelPerformance[channel] || 0) + 1;
    });

    return Object.entries(channelPerformance)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([channel, count]) => ({ channel, leads: count }));
  } catch (error) {
    console.error('Error getting top performing channels:', error);
    return [];
  }
};
