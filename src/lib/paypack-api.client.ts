import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { 
  PaypackConfig, 
  PaypackCashinRequest, 
  PaypackCashoutRequest, 
  PaypackTransactionResponse, 
  PaypackTransactionStatus 
} from '../types/payment.types';
import { getPaypackBaseUrl, paypackEndpoints, paymentConfig } from '../config/payment.config';
import { number } from 'zod';

/**
 * Paypack API Client
 * 
 * This client handles all interactions with the Paypack API:
 * - Authentication and token management
 * - Cashin (payment requests) operations
 * - Cashout (send money) operations
 * - Transaction status verification
 * - Error handling and retry logic
 * 
 * Based on Paypack API documentation and SDK patterns
 */

interface PaypackAuthResponse {
  access: string;
  refresh: string;
  expires: number;
}

export class PaypackApiClient {
  private httpClient: AxiosInstance;
  private config: PaypackConfig;
  private accessToken: string | null = null;
  private tokenExpiresAt: Date | null = null;

  constructor(config?: Partial<PaypackConfig>) {
    this.config = { ...paymentConfig.paypack, ...config };
    this.httpClient = this.createHttpClient();
  }

  /**
   * Create configured HTTP client
   */
  private createHttpClient(): AxiosInstance {
    const baseURL = getPaypackBaseUrl(this.config.environment);
    
    const client = axios.create({
      baseURL,
      timeout: 30000, // 30 seconds
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Enligne-Backend/1.0',
      }
    });

    // Request interceptor for authentication and additional headers
    client.interceptors.request.use(
      async (config: any) => {
        // Skip auth for token endpoint
        if (config.url?.includes('/auth')) {
          return config;
        }

        // Ensure we have a valid token
        await this.ensureValidToken();
        
        if (this.accessToken) {
          config.headers.Authorization = `Bearer ${this.accessToken}`;
        }

        // Add required headers for Paypack API
        config.headers['X-Webhook-Mode'] = this.config.environment; // Specify environment for webhook
        
        // Add Idempotency-Key for transaction endpoints to prevent duplicates
        if (config.url?.includes('/transactions/')) {
          config.headers['Idempotency-Key'] = this.generateIdempotencyKey();
        }

        return config;
      },
      (error: any) => {
        console.error('Paypack API request error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    client.interceptors.response.use(
      (response: any) => response,
      async (error: any) => {
        console.error('Paypack API response error:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          config: {
            method: error.config?.method,
            url: error.config?.url,
            baseURL: error.config?.baseURL
          }
        });

        // Handle 401 errors by refreshing token
        if (error.response?.status === 401 && !error.config?._retry) {
          error.config._retry = true;
          
          try {
            await this.authenticate();
            return client.request(error.config);
          } catch (authError) {
            console.error('Token refresh failed:', authError);
            return Promise.reject(error);
          }
        }

        return Promise.reject(error);
      }
    );

    return client;
  }

  /**
   * Authenticate with Paypack API
   */
  private async authenticate(): Promise<void> {
    try {
      console.log('Authenticating with Paypack API...');
      
      const response: AxiosResponse<PaypackAuthResponse> = await this.httpClient.post(
        paypackEndpoints.auth,
        {
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret
        }
      );

      const { access, refresh, expires } = response.data;
      
      this.accessToken = access;
      this.tokenExpiresAt = new Date(Date.now() + (expires * 1000) - 60000); // Subtract 1 minute for safety
      
      console.log('Paypack authentication successful');
    } catch (error) {
      console.error('Paypack authentication failed:', error);
      throw new Error('Failed to authenticate with Paypack API');
    }
  }

  /**
   * Ensure we have a valid access token
   */
  private async ensureValidToken(): Promise<void> {
    if (!this.accessToken || !this.tokenExpiresAt || new Date() >= this.tokenExpiresAt) {
      await this.authenticate();
    }
  }

  /**
   * Request payment from customer (Cashin)
   */
  async cashin(request: PaypackCashinRequest): Promise<PaypackTransactionResponse> {
    try {
      console.log(`Initiating Paypack cashin for ${request.number}, amount: ${request.amount}`);

      // Format phone number and determine provider
      const formattedPhone = this.formatPhoneNumber(request.number);
      const provider = this.detectMobileProvider(request.number);

      const requestPayload = {
        number: formattedPhone,
        amount: request.amount,
        // Add provider information if detected
        ...(provider && { provider })
      };

      console.log('Paypack cashin payload:', requestPayload);

      const response: AxiosResponse<PaypackTransactionResponse> = await this.httpClient.post(
        paypackEndpoints.cashin,
        requestPayload
      );

      console.log('Paypack cashin response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Paypack cashin failed:', error);
      throw this.handleApiError(error, 'Cashin request failed');
    }
  }

  /**
   * Send money to customer (Cashout)
   */
  async cashout(request: PaypackCashoutRequest): Promise<PaypackTransactionResponse> {
    try {
      console.log(`Initiating Paypack cashout to ${request.number}, amount: ${request.amount}`);

      // Format phone number and determine provider
      const formattedPhone = this.formatPhoneNumber(request.number);
      const provider = this.detectMobileProvider(request.number);

      const requestPayload = {
        number: formattedPhone,
        amount: request.amount,
        // Add provider information if detected
        ...(provider && { provider })
      };

      console.log('Paypack cashout payload:', requestPayload);

      const response: AxiosResponse<PaypackTransactionResponse> = await this.httpClient.post(
        paypackEndpoints.cashout,
        requestPayload
      );

      console.log('Paypack cashout response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Paypack cashout failed:', error);
      throw this.handleApiError(error, 'Cashout request failed');
    }
  }

  /**
   * Get transaction status
   */
  async getTransactionStatus(ref: string): Promise<PaypackTransactionStatus> {
    try {
      console.log(`Getting Paypack transaction status for ref: ${ref}`);

      const response: AxiosResponse<PaypackTransactionStatus> = await this.httpClient.get(
        paypackEndpoints.transaction(ref)
      );

      console.log('Paypack transaction status:', response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to get Paypack transaction status:', error);
      throw this.handleApiError(error, 'Failed to get transaction status');
    }
  }

  /**
   * Get transactions list
   */
  async getTransactions(filters?: {
    offset?: number;
    limit?: number;
    from?: string;
    to?: string;
    kind?: 'CASHIN' | 'CASHOUT';
  }): Promise<any> {
    try {
      console.log('Getting Paypack transactions list with filters:', filters);

      const params = new URLSearchParams();
      if (filters?.offset) params.append('offset', filters.offset.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.from) params.append('from', filters.from);
      if (filters?.to) params.append('to', filters.to);
      if (filters?.kind) params.append('kind', filters.kind);

      const response = await this.httpClient.get(
        `${paypackEndpoints.transactions}?${params.toString()}`
      );

      console.log('Paypack transactions list retrieved');
      return response.data;
    } catch (error) {
      console.error('Failed to get Paypack transactions:', error);
      throw this.handleApiError(error, 'Failed to get transactions');
    }
  }

  /**
   * Get merchant profile
   */
  async getProfile(): Promise<any> {
    try {
      console.log('Getting Paypack merchant profile');

      const response = await this.httpClient.get(paypackEndpoints.profile);

      console.log('Paypack profile retrieved');
      return response.data;
    } catch (error) {
      console.error('Failed to get Paypack profile:', error);
      throw this.handleApiError(error, 'Failed to get profile');
    }
  }

  /**
   * Test API connectivity
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.getProfile();
      return true;
    } catch (error) {
      console.error('Paypack connection test failed:', error);
      return false;
    }
  }

  /**
   * Format phone number for Paypack API
   */
  private formatPhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters
    let cleaned = phoneNumber.replace(/\D/g, '');
    
    // Handle Rwanda phone numbers (Paypack primarily operates in Rwanda)
    if (cleaned.startsWith('250')) {
      // Remove country code for local format
      return cleaned.slice(2);
    } else if (cleaned.startsWith('07') || cleaned.startsWith('08')) {
      // Already in local format
      console.log('cleaned: ', cleaned);
      return cleaned;
    } else if (cleaned.length >= 9) {
      // If it's a 9-digit number, assume it's already in correct format
      return cleaned;
    }
    
    // If it's an unknown format, return the cleaned version
    return cleaned;
  }

  /**
   * Detect mobile money provider based on phone number
   */
  private detectMobileProvider(phoneNumber: string): string | null {
    // Remove all non-digit characters
    let cleaned = phoneNumber.replace(/\D/g, '');
    
    // Handle Rwanda phone numbers
    if (cleaned.startsWith('250')) {
      cleaned = cleaned.slice(2);
    }
    
    // Rwanda mobile number patterns
    if (cleaned.startsWith('078') || cleaned.startsWith('079')) {
      return 'MTN'; // MTN Rwanda
    } else if (cleaned.startsWith('072') || cleaned.startsWith('073')) {
      return 'AIRTEL'; // Airtel Rwanda
    } else if (cleaned.startsWith('075')) {
      return 'TIGO'; // Tigo Rwanda (now Airtel)
    }
    
    // Default to MTN if we can't detect (most common in Rwanda)
    return 'MTN';
  }

  /**
   * Generate unique idempotency key for requests
   */
  private generateIdempotencyKey(): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 15);
    return `${timestamp}-${random}`.substring(0, 32); // Max 32 characters as per Paypack docs
  }

  /**
   * Handle API errors consistently
   */
  private handleApiError(error: any, defaultMessage: string): Error {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;
      
      let message = defaultMessage;
      
      if (data?.message) {
        message = data.message;
      } else if (data?.error) {
        message = data.error;
      } else {
        switch (status) {
          case 400:
            message = 'Invalid request parameters';
            break;
          case 401:
            message = 'Authentication failed - check your credentials';
            break;
          case 403:
            message = 'Access forbidden - insufficient permissions';
            break;
          case 404:
            message = 'Transaction or resource not found';
            break;
          case 429:
            message = 'Rate limit exceeded - please try again later';
            break;
          case 500:
            message = 'Paypack server error - please try again later';
            break;
          default:
            message = `HTTP ${status}: ${defaultMessage}`;
        }
      }
      
      return new Error(message);
    } else if (error.request) {
      return new Error('Network error - unable to reach Paypack API');
    } else {
      return new Error(error.message || defaultMessage);
    }
  }

  /**
   * Get provider information
   */
  getProviderInfo() {
    return {
      name: 'Paypack',
      supportedCurrencies: ['RWF'],
      environment: this.config.environment,
      requiresPhoneNumber: true,
      maxAmount: 10000000, // 10M RWF (adjust based on Paypack limits)
      minAmount: 100 // 100 RWF (adjust based on Paypack limits)
    };
  }
}

// Export singleton instance
export const paypackApiClient = new PaypackApiClient(); 