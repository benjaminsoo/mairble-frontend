// Simple API service for mAIrble backend
import { SecureStorageService } from './storage';

// Backend URLs in priority order
const POSSIBLE_BACKEND_URLS = [
  'https://web-production-31791.up.railway.app',  // Production Railway deployment
  'http://172.16.17.32:8000',                     // Local development (your machine IP)
  'http://127.0.0.1:8000',                        // Local development (localhost)
  'http://localhost:8000',                        // Local development (alternative)
];

let API_BASE_URL = POSSIBLE_BACKEND_URLS[0]; // Default to first URL

// All configuration now handled by backend via environment variables

export interface NightData {
  date: string;
  your_price?: number;
  market_avg_price?: number;
  occupancy?: number;
  event?: string;
  day_of_week?: string;
  lead_time?: number;
  // Enhanced PriceLabs data for better AI analysis
  adr_last_year?: number;  // Historical ADR for year-over-year comparison
  neighborhood_demand?: string;  // Granular demand level (1-5 scale)
  min_price_limit?: number;  // Minimum acceptable price
  avg_los_last_year?: number;  // Historical average length of stay
  seasonal_profile?: string;  // Seasonal context (e.g., "BusyAugust")
}

export interface ListingData {
  id: string;
  pms: string;
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  city_name: string;
  state: string;
  no_of_bedrooms: number;
  min: number;
  base: number;
  max: number;
  group: string;
  subgroup: string;
  tags: string;
  notes: string;
  isHidden: boolean;
  push_enabled: boolean;
  occupancy_next_7: number;
  market_occupancy_next_7: number;
  occupancy_next_30: number;
  market_occupancy_next_30: number;
  occupancy_next_60: number;
  market_occupancy_next_60: number;
  occupancy_past_90: number;
  market_occupancy_past_90: number;
  revenue_past_7: string;
  stly_revenue_past_7: number;
  recommended_base_price: number;
  last_date_pushed: string;
  last_refreshed_at: string;
}

export interface ListingsResponse {
  listings: ListingData[];
}

export interface AIResult {
  date: string;
  suggested_price?: number;
  confidence?: number;
  explanation?: string;
  insight_tag?: string;
}

export interface SinglePriceUpdateRequest {
  date: string;
  price: number;
  price_type?: 'fixed' | 'percent';
  currency?: string;
  update_children?: boolean;
}

export interface SinglePriceUpdateResponse {
  success: boolean;
  message: string;
  updated_date?: string;
  error_details?: string;
}

// New interfaces for chat history functionality
export interface ChatMessage {
  role: string;  // "user" or "assistant"
  content: string;
  timestamp: Date;
}

export interface ConversationInfo {
  conversation_id: string;
  created_at: Date;
  last_message_at: Date;
  message_count: number;
  property_context?: any;
}

export interface ConversationHistory {
  conversation_id: string;
  messages: ChatMessage[];
  property_context?: any;
}

export class ApiService {
  // Test connectivity and find working backend URL
  private static async findWorkingBackendUrl(): Promise<string> {
    for (const url of POSSIBLE_BACKEND_URLS) {
      try {
        console.log(`🔍 Testing backend connection: ${url}`);
        const response = await fetch(`${url}/`, {
          method: 'GET',
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.status === 'healthy') {
            console.log(`✅ Connected to backend: ${url}`);
            API_BASE_URL = url; // Update the global URL
            return url;
          }
        }
      } catch (error) {
        console.log(`❌ Failed to connect to ${url}:`, error);
        continue;
      }
    }
    
    throw new Error('Could not connect to backend server. Please make sure it is running on one of the expected ports.');
  }

  private static async getApiConfig() {
    const config = await SecureStorageService.getApiConfig();
    if (!config?.priceLabs?.apiKey) {
      throw new Error('PriceLabs API key not configured. Please set up your API key first.');
    }
    return config;
  }

  static async fetchPricingData(): Promise<NightData[]> {
    try {
      console.log('🔄 Fetching pricing data from backend...');
      
      // Get API configuration
      const config = await this.getApiConfig();
      
      // Get selected property for listing ID
      const { SecureStorageService } = await import('./storage');
      const selectedProperty = await SecureStorageService.getSelectedProperty();
      
      // Require selected property ID 
      const listingId = selectedProperty?.id;
      
      if (!listingId) {
        throw new Error('No property selected. Please select a property first.');
      }
      
      // First, ensure we can connect to the backend
      await this.findWorkingBackendUrl();
      
      const requestBody = {
        api_key: config.priceLabs.apiKey,
        listing_id: listingId,
        pms: config.priceLabs.pms || 'airbnb',
        selected_property: selectedProperty
      };

      console.log('📤 Sending request:', {
        ...requestBody,
        api_key: `${requestBody.api_key.substring(0, 10)}...`, // Log only first 10 chars
        listing_id: selectedProperty ? `${selectedProperty.name} (${listingId})` : listingId
      });

      const response = await fetch(`${API_BASE_URL}/fetch-pricing-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        let errorMessage = 'Failed to fetch pricing data';
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorMessage;
        } catch {
          // If JSON parsing fails, use generic message
          errorMessage = await response.text() || errorMessage;
        }
        
        console.error('❌ API Error:', response.status, errorMessage);
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('✅ Pricing data received:', data.length, 'nights');
      return data;
      
    } catch (error) {
      console.error('❌ Error fetching pricing data:', error);
      
      // Check if it's an API configuration error
      if (error instanceof Error && error.message.includes('not configured')) {
        throw new Error('API key not configured. Please set up your PriceLabs API key in the app settings.');
      }
      
      throw error;
    }
  }

  // New method for custom date range pricing data
  static async fetchCustomRangePricingData(dateFrom: string, dateTo: string): Promise<NightData[]> {
    try {
      console.log(`🔄 Fetching custom range pricing data from ${dateFrom} to ${dateTo}...`);
      
      // Get API configuration
      const config = await this.getApiConfig();
      
      // Get selected property for listing ID
      const { SecureStorageService } = await import('./storage');
      const selectedProperty = await SecureStorageService.getSelectedProperty();
      
      // Require selected property ID
      const listingId = selectedProperty?.id;
      
      if (!listingId) {
        throw new Error('No property selected. Please select a property first.');
      }
      
      // First, ensure we can connect to the backend
      await this.findWorkingBackendUrl();
      
      const requestBody = {
        api_key: config.priceLabs.apiKey,
        listing_id: listingId,
        pms: config.priceLabs.pms || 'airbnb',
        date_from: dateFrom,
        date_to: dateTo,
        selected_property: selectedProperty
      };

      console.log('📤 Sending custom range request:', {
        ...requestBody,
        api_key: `${requestBody.api_key.substring(0, 10)}...`,
        listing_id: selectedProperty ? `${selectedProperty.name} (${listingId})` : listingId
      });

      const response = await fetch(`${API_BASE_URL}/fetch-pricing-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        let errorMessage = 'Failed to fetch custom range pricing data';
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorMessage;
        } catch {
          // If JSON parsing fails, use generic message
          errorMessage = await response.text() || errorMessage;
        }
        
        console.error('❌ Custom range API Error:', response.status, errorMessage);
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('✅ Custom range pricing data received:', data.length, 'nights');
      return data;
      
    } catch (error) {
      console.error('❌ Error fetching custom range pricing data:', error);
      
      // Check if it's an API configuration error
      if (error instanceof Error && error.message.includes('not configured')) {
        throw new Error('API key not configured. Please set up your PriceLabs API key in the app settings.');
      }
      
      throw error;
    }
  }

  static async analyzeWithAI(nights: NightData[]): Promise<AIResult[]> {
    try {
      console.log('🤖 Starting AI analysis...');
      console.log(`📊 Analyzing ${nights.length} nights:`, nights.map(n => `${n.date}: $${n.your_price} vs $${n.market_avg_price}`));
      
      // Ensure we're using the working backend URL
      if (!API_BASE_URL) {
        await this.findWorkingBackendUrl();
      }
      
      console.log(`🔗 Using backend URL: ${API_BASE_URL}`);
      
      // Get selected property context for AI analysis
      const { SecureStorageService } = await import('./storage');
      const selectedProperty = await SecureStorageService.getSelectedProperty();
      
      const requestBody = {
        nights: nights,
        model: 'gpt-4',
        selected_property: selectedProperty ? {
          id: selectedProperty.id,
          name: selectedProperty.name,
          location: selectedProperty.location,
          no_of_bedrooms: selectedProperty.no_of_bedrooms
        } : null
      };
      
      if (selectedProperty) {
        console.log(`🏠 Including property info in AI analysis: ${selectedProperty.name} (${selectedProperty.no_of_bedrooms} bedrooms)`);
      }
      
      console.log('📤 Sending AI analysis request:', JSON.stringify(requestBody, null, 2));
      
      const response = await fetch(`${API_BASE_URL}/analyze-pricing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      console.log(`📥 AI analysis response status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ AI analysis failed with ${response.status}:`, errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ AI analysis completed successfully!');
      console.log('📊 AI results received:', data.length, 'results');
      
      // Log each result in detail
      data.forEach((result: AIResult, index: number) => {
        console.log(`🔍 Result ${index + 1}: ${result.date}`);
        console.log(`  💰 Suggested: $${result.suggested_price} (confidence: ${result.confidence}%)`);
        console.log(`  💡 Insight: "${result.insight_tag}"`);
        console.log(`  📝 Explanation: "${result.explanation?.substring(0, 100)}..."`);
      });
      
      return data;
      
    } catch (error) {
      console.error('❌ CRITICAL ERROR in AI analysis:', error);
      console.error('❌ Error details:', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  static async chatWithAI(message: string, conversationId?: string): Promise<{ response: string; conversationId: string }> {
    try {
      console.log('💬 Starting chat with AI...');
      console.log(`📝 Message: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`);
      console.log(`🆔 Conversation ID: ${conversationId || 'new conversation'}`);
      
      // Ensure we're using the working backend URL
      if (!API_BASE_URL) {
        await this.findWorkingBackendUrl();
      }
      
      console.log(`🔗 Using backend URL: ${API_BASE_URL}`);
      
      // Get property context for personalized responses  
      const { SecureStorageService } = await import('./storage');
      const propertyContext = await SecureStorageService.getPropertyContext();
      const selectedProperty = await SecureStorageService.getSelectedProperty();
      
      const requestBody = {
        message: message,
        conversation_id: conversationId,
        property_context: propertyContext ? {
          mainGuest: propertyContext.mainGuest,
          specialFeature: propertyContext.specialFeature,
          pricingGoal: propertyContext.pricingGoal,
          specialFeatureDetails: propertyContext.specialFeatureDetails
        } : null,
        selected_property: selectedProperty ? {
          id: selectedProperty.id,
          name: selectedProperty.name,
          location: selectedProperty.location,
          no_of_bedrooms: selectedProperty.no_of_bedrooms
        } : null
      };
      
      if (propertyContext) {
        console.log('📝 Including property context in chat request');
        if (propertyContext.specialFeatureDetails && Object.keys(propertyContext.specialFeatureDetails).length > 0) {
          console.log('🎯 Custom feature details found:', propertyContext.specialFeatureDetails);
        }
      }
      
      if (selectedProperty) {
        console.log(`🏠 Including selected property: ${selectedProperty.name} (${selectedProperty.no_of_bedrooms} bedrooms)`);
      }
      
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      console.log(`📥 Chat response status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Chat failed with ${response.status}:`, errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Chat completed successfully!');
      console.log(`🤖 AI response: ${data.response.substring(0, 100)}${data.response.length > 100 ? '...' : ''}`);
      console.log(`🆔 Conversation ID: ${data.conversation_id}`);
      
      return {
        response: data.response,
        conversationId: data.conversation_id
      };
      
    } catch (error) {
      console.error('❌ CRITICAL ERROR in chat:', error);
      console.error('❌ Error details:', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  // NEW: Get full conversation history
  static async getConversationHistory(conversationId: string): Promise<ConversationHistory> {
    try {
      console.log(`📖 Retrieving conversation history: ${conversationId}`);
      
      // Ensure we're using the working backend URL
      if (!API_BASE_URL) {
        await this.findWorkingBackendUrl();
      }
      
      const response = await fetch(`${API_BASE_URL}/get-conversation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ conversation_id: conversationId })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Failed to get conversation history:`, errorText);
        throw new Error(`Failed to retrieve conversation: ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Conversation history retrieved:', data.messages.length, 'messages');
      
      // Convert timestamp strings back to Date objects
      const messages = data.messages.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      }));
      
      return {
        conversation_id: data.conversation_id,
        messages: messages,
        property_context: data.property_context
      };
      
    } catch (error) {
      console.error('❌ Error retrieving conversation history:', error);
      throw error;
    }
  }

  // NEW: List all conversations
  static async listConversations(): Promise<ConversationInfo[]> {
    try {
      console.log('📋 Listing all conversations...');
      
      // Ensure we're using the working backend URL
      if (!API_BASE_URL) {
        await this.findWorkingBackendUrl();
      }
      
      const response = await fetch(`${API_BASE_URL}/conversations`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Failed to list conversations:`, errorText);
        throw new Error(`Failed to list conversations: ${errorText}`);
      }

      const conversations = await response.json();
      console.log('✅ Conversations listed:', conversations.length, 'conversations');
      
      // Convert timestamp strings back to Date objects
      return conversations.map((conv: any) => ({
        ...conv,
        created_at: new Date(conv.created_at),
        last_message_at: new Date(conv.last_message_at)
      }));
      
    } catch (error) {
      console.error('❌ Error listing conversations:', error);
      throw error;
    }
  }

  // NEW: Delete a conversation
  static async deleteConversation(conversationId: string): Promise<void> {
    try {
      console.log(`🗑️ Deleting conversation: ${conversationId}`);
      
      // Ensure we're using the working backend URL
      if (!API_BASE_URL) {
        await this.findWorkingBackendUrl();
      }
      
      const response = await fetch(`${API_BASE_URL}/conversation/${conversationId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Failed to delete conversation:`, errorText);
        throw new Error(`Failed to delete conversation: ${errorText}`);
      }

      console.log('✅ Conversation deleted successfully');
      
    } catch (error) {
      console.error('❌ Error deleting conversation:', error);
      throw error;
    }
  }

  // Utility method to check if API is configured
  static async isApiConfigured(): Promise<boolean> {
    try {
      const config = await SecureStorageService.getApiConfig();
      return !!(config?.priceLabs?.apiKey?.trim());
    } catch (error) {
      return false;
    }
  }

  // Utility method to get current API configuration status
  static async getApiStatus(): Promise<{ configured: boolean; pms: string | null }> {
    try {
      const config = await SecureStorageService.getApiConfig();
      return {
        configured: !!(config?.priceLabs?.apiKey?.trim()),
        pms: config?.priceLabs?.pms || null
      };
    } catch (error) {
      return { configured: false, pms: null };
    }
  }

  // Update price for a single date with explicit user control
  static async updateSinglePrice(request: SinglePriceUpdateRequest): Promise<SinglePriceUpdateResponse> {
    try {
      console.log(`🔄 Updating price for ${request.date} to $${request.price}...`);
      
      // Get API configuration
      const config = await this.getApiConfig();
      
      // Get selected property for listing ID
      const { SecureStorageService } = await import('./storage');
      const selectedProperty = await SecureStorageService.getSelectedProperty();
      
      // Require selected property ID
      const listingId = selectedProperty?.id;
      
      // Validate required configuration
      if (!listingId) {
        throw new Error('No property selected. Please select a property first.');
      }
      
      // Ensure we're using the working backend URL
      if (!API_BASE_URL) {
        await this.findWorkingBackendUrl();
      }
      
      const requestBody = {
        api_key: config.priceLabs.apiKey,
        listing_id: listingId,
        pms: config.priceLabs.pms || 'airbnb',
        date: request.date,
        price: request.price,
        price_type: request.price_type || 'fixed',
        currency: request.currency || 'USD',
        update_children: request.update_children || false,
      };

      // Log request details (without exposing the full API key)
      console.log('📤 Sending price update request:', {
        ...requestBody,
        api_key: `${requestBody.api_key.substring(0, 10)}...`, // Log only first 10 chars
        listing_id: selectedProperty ? `${selectedProperty.name} (${listingId})` : listingId
      });

      const response = await fetch(`${API_BASE_URL}/update-single-price`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      console.log(`📥 Single price update response status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Single price update failed with ${response.status}:`, errorText);
        
        // Parse error for better user messages
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.detail && Array.isArray(errorData.detail)) {
            const missingFields = errorData.detail
              .filter((err: any) => err.type === 'missing')
              .map((err: any) => err.loc[err.loc.length - 1]);
            
            if (missingFields.includes('listing_id')) {
              throw new Error('Listing ID is missing. Please configure your Listing ID in app settings.');
            }
          }
        } catch (parseError) {
          // If we can't parse the error, use the original
        }
        
        throw new Error(`Failed to update price: ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Single price update completed!');
      console.log(`📊 Update result:`, data);
      
      return data;
      
    } catch (error) {
      console.error('❌ CRITICAL ERROR in single price update:', error);
      console.error('❌ Error details:', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  static async fetchListings(): Promise<ListingsResponse> {
    try {
      console.log('🏠 Fetching user property listings...');
      
      // Ensure we're using the working backend URL
      if (!API_BASE_URL) {
        await this.findWorkingBackendUrl();
      }
      
      const apiConfig = await this.getApiConfig();
      if (!apiConfig) {
        throw new Error('API configuration not found. Please set up your PriceLabs API key in Settings.');
      }

      const requestBody = {
        api_key: apiConfig.priceLabs.apiKey,
      };

      console.log('🔗 Requesting listings from backend...');
      const response = await fetch(`${API_BASE_URL}/listings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      console.log(`📥 Listings response status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Listings request failed:`, errorText);
        throw new Error(`Failed to fetch listings: ${response.status} ${response.statusText}`);
      }

      const data: ListingsResponse = await response.json();
      console.log(`✅ Successfully fetched ${data.listings.length} property listings`);
      
      return data;
      
    } catch (error) {
      console.error('❌ Error fetching listings:', error);
      throw error;
    }
  }
} 