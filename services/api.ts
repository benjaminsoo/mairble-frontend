// Simple API service for mAIrble backend
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

export interface AIResult {
  date: string;
  suggested_price?: number;
  confidence?: number;
  explanation?: string;
  insight_tag?: string;
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

  static async fetchPricingData(): Promise<NightData[]> {
    try {
      console.log('🔄 Fetching pricing data from backend...');
      
      // First, ensure we can connect to the backend
      await this.findWorkingBackendUrl();
      
      const response = await fetch(`${API_BASE_URL}/fetch-pricing-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({})  // Empty body - backend will use defaults
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Pricing data received:', data.length, 'nights');
      return data;
      
    } catch (error) {
      console.error('❌ Error fetching pricing data:', error);
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
      
      const requestBody = {
        nights: nights,
        model: 'gpt-4'
      };
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
      
      // Ensure we're using the working backend URL
      if (!API_BASE_URL) {
        await this.findWorkingBackendUrl();
      }
      
      console.log(`🔗 Using backend URL: ${API_BASE_URL}`);
      
      const requestBody = {
        message: message,
        conversation_id: conversationId
      };
      
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
} 