import { SecureStorageService } from '@/services/storage';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';

export interface ApiSetupStatus {
  isConfigured: boolean;
  isLoading: boolean;
  checkConfiguration: () => Promise<boolean>;
}

export function useApiSetup(): ApiSetupStatus {
  const [isConfigured, setIsConfigured] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkConfiguration = async () => {
    try {
      setIsLoading(true);
      const hasApiKey = await SecureStorageService.isPriceLabsApiConfigured();
      setIsConfigured(hasApiKey);
      
      console.log('🔑 API Configuration check:', hasApiKey ? 'Configured' : 'Not configured');
      
      return hasApiKey;
    } catch (error) {
      console.error('❌ Error checking API configuration:', error);
      setIsConfigured(false);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Check configuration on mount
  useEffect(() => {
    checkConfiguration();
  }, []);

  return {
    isConfigured,
    isLoading,
    checkConfiguration,
  };
}

export function useApiSetupNavigation() {
  const { isConfigured, isLoading } = useApiSetup();

  useEffect(() => {
    if (isLoading) return; // Don't navigate while loading

    // Navigate to setup if not configured
    if (!isConfigured) {
      console.log('🚀 Navigating to setup screen - API key not configured');
      router.replace('/setup');
    }
  }, [isConfigured, isLoading]);

  return { isConfigured, isLoading };
} 