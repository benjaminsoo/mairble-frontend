import * as SecureStore from 'expo-secure-store';

export interface ApiConfig {
  priceLabs: {
    apiKey: string;
    listingId?: string;
    pms?: string;
  };
  openAI?: {
    apiKey?: string;
  };
}

export interface PropertyContext {
  guestProfile: string;  // Answer to "Who are your typical guests..."
  competitiveAdvantage: string;  // Answer to "What's your main competition..."
  bookingPatterns: string;  // Answer to "When do you get booked up..."
  createdAt: string;  // Timestamp
}

const STORAGE_KEYS = {
  API_CONFIG: 'api_config',
  PROPERTY_CONTEXT: 'property_context',
} as const;

export class SecureStorageService {
  /**
   * Store API configuration securely
   */
  static async storeApiConfig(config: ApiConfig): Promise<void> {
    try {
      await SecureStore.setItemAsync(
        STORAGE_KEYS.API_CONFIG,
        JSON.stringify(config)
      );
      console.log('✅ API configuration stored securely');
    } catch (error) {
      console.error('❌ Failed to store API configuration:', error);
      throw new Error('Failed to store API configuration');
    }
  }

  /**
   * Retrieve API configuration
   */
  static async getApiConfig(): Promise<ApiConfig | null> {
    try {
      const configString = await SecureStore.getItemAsync(STORAGE_KEYS.API_CONFIG);
      if (!configString) {
        return null;
      }
      
      const config = JSON.parse(configString) as ApiConfig;
      console.log('✅ API configuration retrieved');
      return config;
    } catch (error) {
      console.error('❌ Failed to retrieve API configuration:', error);
      return null;
    }
  }

  /**
   * Check if PriceLabs API key is configured
   */
  static async isPriceLabsApiConfigured(): Promise<boolean> {
    try {
      const config = await this.getApiConfig();
      return !!(config?.priceLabs?.apiKey?.trim());
    } catch (error) {
      return false;
    }
  }

  /**
   * Get PriceLabs API key
   */
  static async getPriceLabsApiKey(): Promise<string | null> {
    try {
      const config = await this.getApiConfig();
      return config?.priceLabs?.apiKey || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Update just the PriceLabs API key
   */
  static async updatePriceLabsApiKey(apiKey: string, listingId?: string, pms?: string): Promise<void> {
    try {
      const existingConfig = await this.getApiConfig() || { priceLabs: { apiKey: '' } };
      const updatedConfig: ApiConfig = {
        ...existingConfig,
        priceLabs: {
          apiKey: apiKey.trim(),
          listingId: listingId?.trim() || existingConfig.priceLabs?.listingId,
          pms: pms?.trim() || existingConfig.priceLabs?.pms || 'airbnb',
        }
      };
      
      await this.storeApiConfig(updatedConfig);
    } catch (error) {
      console.error('❌ Failed to update PriceLabs API key:', error);
      throw new Error('Failed to update API key');
    }
  }

  /**
   * Clear all stored API configuration
   */
  static async clearApiConfig(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(STORAGE_KEYS.API_CONFIG);
      console.log('✅ API configuration cleared');
    } catch (error) {
      console.error('❌ Failed to clear API configuration:', error);
      throw new Error('Failed to clear API configuration');
    }
  }

  /**
   * Validate API key format (basic validation)
   */
  static validatePriceLabsApiKey(apiKey: string): { isValid: boolean; error?: string } {
    if (!apiKey || typeof apiKey !== 'string') {
      return { isValid: false, error: 'API key is required' };
    }

    const trimmedKey = apiKey.trim();
    
    if (trimmedKey.length < 10) {
      return { isValid: false, error: 'API key appears to be too short' };
    }

    if (trimmedKey.length > 200) {
      return { isValid: false, error: 'API key appears to be too long' };
    }

    // Basic format check - alphanumeric with some special characters
    if (!/^[a-zA-Z0-9_\-\.]+$/.test(trimmedKey)) {
      return { isValid: false, error: 'API key contains invalid characters' };
    }

    return { isValid: true };
  }

  /**
   * Store property context from onboarding questions
   */
  static async storePropertyContext(context: PropertyContext): Promise<void> {
    try {
      await SecureStore.setItemAsync(
        STORAGE_KEYS.PROPERTY_CONTEXT,
        JSON.stringify(context)
      );
      console.log('✅ Property context stored securely');
    } catch (error) {
      console.error('❌ Failed to store property context:', error);
      throw new Error('Failed to store property context');
    }
  }

  /**
   * Retrieve property context
   */
  static async getPropertyContext(): Promise<PropertyContext | null> {
    try {
      const contextString = await SecureStore.getItemAsync(STORAGE_KEYS.PROPERTY_CONTEXT);
      if (!contextString) {
        return null;
      }
      
      const context = JSON.parse(contextString) as PropertyContext;
      console.log('✅ Property context retrieved');
      return context;
    } catch (error) {
      console.error('❌ Failed to retrieve property context:', error);
      return null;
    }
  }

  /**
   * Check if property context is configured
   */
  static async isPropertyContextConfigured(): Promise<boolean> {
    try {
      const context = await this.getPropertyContext();
      return !!(context?.guestProfile?.trim() && context?.competitiveAdvantage?.trim() && context?.bookingPatterns?.trim());
    } catch (error) {
      return false;
    }
  }

  /**
   * Clear property context
   */
  static async clearPropertyContext(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(STORAGE_KEYS.PROPERTY_CONTEXT);
      console.log('✅ Property context cleared');
    } catch (error) {
      console.error('❌ Failed to clear property context:', error);
      throw new Error('Failed to clear property context');
    }
  }
} 