import { 
  MoMoCollectionRequest, 
  MoMoCollectionResponse, 
  MoMoPaymentStatus,
  MoMoConfig 
} from '../types/payment.types';
import { paymentConfig, getMoMoBaseUrl, moMoEndpoints } from '../config/payment.config';

/**
 * MTN MoMo API Client
 * 
 * This client handles all interactions with the MTN MoMo API including:
 * - Authentication token management
 * - Request to Pay operations
 * - Payment status verification
 * - Error handling and retries
 * 
 * The client implements the MTN MoMo Collections API for receiving payments.
 */

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
}

class MoMoApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: any,
    public isRetryable: boolean = false
  ) {
    super(message);
    this.name = 'MoMoApiError';
  }
}

export class MoMoApiClient {
  private config: MoMoConfig;
  private baseUrl: string;
  private accessToken: string | null = null;
  private tokenExpiresAt: Date | null = null;

  constructor(config?: Partial<MoMoConfig>) {
    this.config = { ...paymentConfig.momo, ...config };
    this.baseUrl = getMoMoBaseUrl(this.config.environment);
  }

  /**
   * Generate access token for API authentication
   * Tokens are valid for 1 hour and are automatically refreshed
   */
  private async generateAccessToken(): Promise<string> {
    try {
      // Check if current token is still valid (with 5-minute buffer)
      if (this.accessToken && this.tokenExpiresAt) {
        const now = new Date();
        const bufferTime = 5 * 60 * 1000; // 5 minutes in milliseconds
        if (now.getTime() < (this.tokenExpiresAt.getTime() - bufferTime)) {
          return this.accessToken;
        }
      }

      console.log('Generating new MoMo access token...');

      const credentials = Buffer.from(`${this.config.apiUser}:${this.config.apiKey}`).toString('base64');
      
      const response = await fetch(`${this.baseUrl}${moMoEndpoints.token}`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Ocp-Apim-Subscription-Key': this.config.collectionPrimaryKey,
          'X-Target-Environment': this.config.targetEnvironment,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new MoMoApiError(
          `Failed to generate access token: ${response.status} ${response.statusText}`,
          response.status,
          await response.text(),
          response.status >= 500 // Server errors are retryable
        );
      }

      const data = await response.json() as { access_token?: string; expires_in?: number };
      
      if (!data.access_token) {
        throw new MoMoApiError('Invalid token response: no access_token received');
      }

      this.accessToken = data.access_token;
      
      // Tokens typically expire in 3600 seconds (1 hour)
      const expiresIn = data.expires_in || 3600;
      this.tokenExpiresAt = new Date(Date.now() + (expiresIn * 1000));

      console.log(`MoMo access token generated successfully, expires at: ${this.tokenExpiresAt.toISOString()}`);
      
      return this.accessToken;
    } catch (error) {
      console.error('Error generating MoMo access token:', error);
      throw error instanceof MoMoApiError ? error : new MoMoApiError(`Token generation failed: ${error}`);
    }
  }

  /**
   * Make authenticated API request with retry logic
   */
  private async makeAuthenticatedRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    retryCount: number = 0
  ): Promise<ApiResponse<T>> {
    try {
      const accessToken = await this.generateAccessToken();
      
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${accessToken}`,
        'Ocp-Apim-Subscription-Key': this.config.collectionPrimaryKey,
        'X-Target-Environment': this.config.targetEnvironment,
        'Content-Type': 'application/json',
        'X-Reference-Id': (options.headers as any)?.['X-Reference-Id'] || this.generateUUID(),
        ...(options.headers as Record<string, string>)
      };

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers
      });

      const responseText = await response.text();
      let responseData: any = null;

      // Parse JSON if response has content
      if (responseText) {
        try {
          responseData = JSON.parse(responseText);
        } catch {
          responseData = responseText;
        }
      }

      if (response.ok) {
        return {
          success: true,
          data: responseData,
          statusCode: response.status
        };
      }

      // Handle specific error cases
      if (response.status === 401) {
        // Token expired, clear it and retry once
        if (retryCount === 0) {
          console.log('Access token expired, regenerating...');
          this.accessToken = null;
          this.tokenExpiresAt = null;
          return this.makeAuthenticatedRequest(endpoint, options, retryCount + 1);
        }
      }

      // Log detailed error information for debugging
      console.error('MoMo API Error Details:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        responseData,
        requestUrl: `${this.baseUrl}${endpoint}`,
        requestMethod: options.method,
        requestHeaders: options.headers
      });

      throw new MoMoApiError(
        `API request failed: ${response.status} ${response.statusText}`,
        response.status,
        responseData,
        response.status >= 500 || response.status === 429 // Server errors and rate limits are retryable
      );

    } catch (error) {
      if (error instanceof MoMoApiError) {
        throw error;
      }
      
      throw new MoMoApiError(
        `Request failed: ${error}`,
        undefined,
        undefined,
        true // Network errors are retryable
      );
    }
  }

  /**
   * Initiate a Request to Pay transaction
   */
  async requestToPay(request: MoMoCollectionRequest): Promise<MoMoCollectionResponse> {
    const referenceId = this.generateUUID();
    
    console.log(`Initiating MoMo Request to Pay with reference: ${referenceId}`, {
      amount: request.amount,
      currency: request.currency,
      phoneNumber: request.payer.partyId
    });

    try {
      // Get access token
      const accessToken = await this.generateAccessToken();

      // Fix callback URL format for sandbox (use http instead of https)
      const callbackUrl = this.config.environment === 'sandbox' 
        ? this.config.callbackUrl.replace('https://', 'http://')
        : this.config.callbackUrl;

      // Log the full request details for debugging
      console.log('MoMo API Request Details:', {
        endpoint: moMoEndpoints.requestToPay,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-Reference-Id': referenceId,
          'X-Callback-Url': callbackUrl,
          'Ocp-Apim-Subscription-Key': this.config.collectionPrimaryKey,
          'X-Target-Environment': this.config.targetEnvironment,
          'Content-Type': 'application/json'
        },
        body: request
      });

      const response = await fetch(`${this.baseUrl}${moMoEndpoints.requestToPay}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-Reference-Id': referenceId,
          'X-Callback-Url': callbackUrl,
          'Ocp-Apim-Subscription-Key': this.config.collectionPrimaryKey,
          'X-Target-Environment': this.config.targetEnvironment,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
      });

      if (response.ok) {
        return {
          referenceId,
          status: 'PENDING'
        };
      }

      // Log detailed error information for debugging
      console.error('MoMo API Error Details:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        responseData: await response.text(),
        requestUrl: `${this.baseUrl}${moMoEndpoints.requestToPay}`,
        requestMethod: 'POST',
        requestHeaders: {
          'Authorization': `Bearer ${accessToken}`,
          'X-Reference-Id': referenceId,
          'X-Callback-Url': callbackUrl,
          'Ocp-Apim-Subscription-Key': this.config.collectionPrimaryKey,
          'X-Target-Environment': this.config.targetEnvironment,
          'Content-Type': 'application/json'
        }
      });

      throw new MoMoApiError(
        `Request to Pay failed: ${response.status} ${response.statusText}`,
        response.status,
        null,
        response.status >= 500 || response.status === 429
      );

    } catch (error) {
      console.error('MoMo Request to Pay failed:', error);
      throw error;
    }
  }

  /**
   * Check payment status
   */
  async getPaymentStatus(referenceId: string): Promise<MoMoPaymentStatus> {
    console.log(`Checking MoMo payment status for reference: ${referenceId}`);

    try {
      const response = await this.makeAuthenticatedRequest<MoMoPaymentStatus>(
        moMoEndpoints.paymentStatus(referenceId),
        {
          method: 'GET'
        }
      );

      if (response.success && response.data) {
        return response.data;
      }

      throw new MoMoApiError(
        `Failed to get payment status: ${response.error}`,
        response.statusCode
      );

    } catch (error) {
      console.error(`Error getting payment status for ${referenceId}:`, error);
      throw error;
    }
  }

  /**
   * Get account balance (useful for monitoring)
   */
  async getAccountBalance(): Promise<{ amount: string; currency: string }> {
    try {
      const response = await this.makeAuthenticatedRequest<{ availableBalance: string; currency: string }>(
        moMoEndpoints.accountBalance,
        {
          method: 'GET'
        }
      );

      if (response.success && response.data) {
        return {
          amount: response.data.availableBalance,
          currency: response.data.currency
        };
      }

      throw new MoMoApiError(
        `Failed to get account balance: ${response.error}`,
        response.statusCode
      );

    } catch (error) {
      console.error('Error getting account balance:', error);
      throw error;
    }
  }

  /**
   * Validate account holder information
   */
  async validateAccountHolder(phoneNumber: string): Promise<boolean> {
    try {
      const response = await this.makeAuthenticatedRequest<any>(
        moMoEndpoints.accountDetails('MSISDN', phoneNumber),
        {
          method: 'GET'
        }
      );

      return response.success;

    } catch (error) {
      console.warn(`Account validation failed for ${phoneNumber}:`, error);
      return false;
    }
  }

  /**
   * Generate UUID for reference IDs
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Test API connectivity
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.generateAccessToken();
      return true;
    } catch (error) {
      console.error('MoMo API connection test failed:', error);
      return false;
    }
  }
}

// Singleton instance
export const moMoApiClient = new MoMoApiClient(); 