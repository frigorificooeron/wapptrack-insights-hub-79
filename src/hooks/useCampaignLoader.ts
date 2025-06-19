
import { useState, useEffect } from 'react';
import { getCampaigns } from '@/services/dataService';
import { toast } from 'sonner';
import { Campaign } from '@/types';
import { useEnhancedPixelTracking } from './useEnhancedPixelTracking';
import { useProject } from '@/context/ProjectContext';

export const useCampaignLoader = (campaignId: string | null, debug: boolean) => {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const { currentProject } = useProject();

  // Use enhanced pixel tracking
  const {
    trackEnhancedPageView,
    logTrackingSummary,
    isReady: trackingReady
  } = useEnhancedPixelTracking(campaign, debug);

  useEffect(() => {
    const loadCampaignDetails = async () => {
      if (!campaignId || !currentProject) {
        setError('ID da campanha ou projeto não encontrado');
        setIsLoading(false);
        return;
      }

      try {
        const campaigns = await getCampaigns(currentProject.id);
        const targetCampaign = campaigns.find(c => c.id === campaignId);
        
        if (targetCampaign) {
          console.log('📋 Campaign loaded:', targetCampaign.name, 'Redirect type:', targetCampaign.redirect_type);
          setCampaign(targetCampaign);
        } else {
          toast.warning('Campanha não encontrada. O contato será registrado em uma campanha padrão.');
        }
      } catch (err) {
        console.error('❌ Error loading campaign:', err);
        toast.warning('Erro ao carregar detalhes da campanha, mas você ainda pode continuar.');
      } finally {
        setIsLoading(false);
      }
    };

    loadCampaignDetails();
  }, [campaignId, currentProject]);

  // Enhanced page view tracking when campaign and tracking are ready
  useEffect(() => {
    if (campaign && trackingReady && !isLoading) {
      console.log('🚀 Executing enhanced page view tracking...');
      trackEnhancedPageView();
      
      // Log comprehensive tracking summary
      setTimeout(() => {
        logTrackingSummary();
      }, 1000);
    }
  }, [campaign, trackingReady, isLoading]);

  return {
    campaign,
    isLoading,
    error,
    pixelInitialized: !!campaign?.pixel_id && trackingReady
  };
};
