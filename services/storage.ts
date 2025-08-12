import * as SecureStore from 'expo-secure-store';

export interface ApiConfig {
  priceLabs: {
    apiKey: string;
    pms?: string;
  };
  openAI?: {
    apiKey?: string;
  };
}

export interface PropertyContext {
  mainGuest: string;  // Answer to "Who is your main guest?" (Leisure/Business/Groups) - single select
  specialFeature: string[];  // Answer to "What makes your property special?" - multiple select
  pricingGoal: string[];  // Answer to "What's your top pricing goal?" - multiple select
  // New: Custom descriptions for selected features
  specialFeatureDetails?: { [key: string]: string };  // Optional custom descriptions for each selected feature
  createdAt: string;  // Timestamp
}

export interface SelectedProperty {
  id: string;
  name: string;
  location: string;  // combination of city_name and state
  no_of_bedrooms: number;
  selectedAt: string;  // Timestamp when selected
}

const STORAGE_KEYS = {
  API_CONFIG: 'api_config',
  PROPERTY_CONTEXT: 'property_context',
  SELECTED_PROPERTY: 'selected_property',
} as const;

export class SecureStorageService {
  /**
   * Generic method to store any string value securely
   */
  static async setItem(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value);
      console.log(`✅ Stored item with key: ${key}`);
    } catch (error) {
      console.error(`❌ Failed to store item with key ${key}:`, error);
      throw new Error(`Failed to store item: ${key}`);
    }
  }

  /**
   * Generic method to retrieve any string value securely
   */
  static async getItem(key: string): Promise<string | null> {
    try {
      const value = await SecureStore.getItemAsync(key);
      if (value) {
        console.log(`✅ Retrieved item with key: ${key}`);
      }
      return value;
    } catch (error) {
      console.error(`❌ Failed to retrieve item with key ${key}:`, error);
      return null;
    }
  }

  /**
   * Generic method to remove any stored value securely
   */
  static async removeItem(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
      console.log(`✅ Removed item with key: ${key}`);
    } catch (error) {
      console.error(`❌ Failed to remove item with key ${key}:`, error);
      throw new Error(`Failed to remove item: ${key}`);
    }
  }

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
  static async updatePriceLabsApiKey(apiKey: string, pms?: string): Promise<void> {
    try {
      const existingConfig = await this.getApiConfig() || { priceLabs: { apiKey: '' } };
      const updatedConfig: ApiConfig = {
        ...existingConfig,
        priceLabs: {
          apiKey: apiKey.trim(),
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
      return !!(context?.mainGuest?.trim() && context?.specialFeature?.length > 0 && context?.pricingGoal?.length > 0);
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

  /**
   * Store selected property information
   */
  static async storeSelectedProperty(property: SelectedProperty): Promise<void> {
    try {
      const propertyString = JSON.stringify(property);
      await SecureStore.setItemAsync(STORAGE_KEYS.SELECTED_PROPERTY, propertyString);
      console.log(`✅ Selected property stored: ${property.name}`);
    } catch (error) {
      console.error('❌ Failed to store selected property:', error);
      throw new Error('Failed to store selected property');
    }
  }

  /**
   * Retrieve selected property information
   */
  static async getSelectedProperty(): Promise<SelectedProperty | null> {
    try {
      const propertyString = await SecureStore.getItemAsync(STORAGE_KEYS.SELECTED_PROPERTY);
      if (!propertyString) {
        return null;
      }
      
      const property = JSON.parse(propertyString) as SelectedProperty;
      console.log(`✅ Retrieved selected property: ${property.name}`);
      return property;
    } catch (error) {
      console.error('❌ Failed to retrieve selected property:', error);
      return null;
    }
  }

  /**
   * Check if a property is selected
   */
  static async isPropertySelected(): Promise<boolean> {
    try {
      const property = await this.getSelectedProperty();
      return !!property?.id;
    } catch (error) {
      return false;
    }
  }

  /**
   * Clear selected property
   */
  static async clearSelectedProperty(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(STORAGE_KEYS.SELECTED_PROPERTY);
      console.log('✅ Selected property cleared');
    } catch (error) {
      console.error('❌ Failed to clear selected property:', error);
      throw new Error('Failed to clear selected property');
    }
  }
} 