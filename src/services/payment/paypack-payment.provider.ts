import { 
  IPaymentProvider, 
  PaymentRequest, 
  PaymentResponse, 
  PaymentVerificationResult, 
  PaymentStatus,
  PaypackCashinRequest,
  PaypackConfig
} from '../../types/payment.types';
import { PaypackApiClient } from '../../lib/paypack-api.client';
import { paymentConfig } from '../../config/payment.config';

/**
 * Paypack Payment Provider
 * 
 * This provider implements the payment interface for Paypack payments.
 * It handles the business logic for:
 * - Payment processing via cashin operations
 * - Status verification and transaction tracking
 * - Error handling and retry logic
 * - Phone number validation for supported networks (MTN, Airtel)
 * 
 * Paypack supports multiple mobile money networks in Rwanda:
 * - MTN Mobile Money
 * - Airtel Money
 * - Direct bank transfers (future)
 */

export class PaypackPaymentProvider implements IPaymentProvider {
  private config: PaypackConfig;
  private paypackClient: PaypackApiClient;

  constructor(config?: Partial<PaypackConfig>) {
    this.config = { ...paymentConfig.paypack, ...config };
    this.paypackClient = new PaypackApiClient(this.config);
  }

  /**
   * Process a payment request using Paypack
   */
  async processPayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      console.log(`Processing Paypack payment for ${request.phoneNumber}, amount: ${request.amount} ${request.currency}`);

      // Validate input
      this.validatePaymentRequest(request);

      // Format phone number for Paypack API
      const formattedPhoneNumber = this.formatPhoneNumber(request.phoneNumber);

      // Prepare Paypack cashin request
      const paypackRequest: PaypackCashinRequest = {
        number: formattedPhoneNumber,
        amount: request.amount
      };

      // Initiate payment with Paypack
      const paypackResponse = await this.paypackClient.cashin(paypackRequest);

      return {
        success: true,
        transactionId: paypackResponse.ref,
        reference: request.reference,
        status: this.mapPaypackStatusToPaymentStatus(paypackResponse.status),
        message: paypackResponse.message || 'Payment initiated successfully. Customer will receive a prompt to approve the payment.',
        metadata: {
          paypackRef: paypackResponse.ref,
          phoneNumber: formattedPhoneNumber,
          initiatedAt: new Date().toISOString(),
          amount: request.amount,
          currency: request.currency,
          environment: this.config.environment
        }
      };

    } catch (error) {
      console.error('Paypack payment processing failed:', error);

      return {
        success: false,
        transactionId: '',
        reference: request.reference,
        status: PaymentStatus.FAILED,
        message: this.getErrorMessage(error),
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Verify payment status with Paypack API
   */
  async verifyPayment(transactionId: string): Promise<PaymentVerificationResult> {
    try {
      console.log(`Verifying Paypack payment status for transaction: ${transactionId}`);

      const paypackStatus = await this.paypackClient.getTransactionStatus(transactionId);

      const paymentStatus = this.mapPaypackStatusToPaymentStatus(paypackStatus.status);
      
      return {
        isValid: true,
        status: paymentStatus,
        amount: paypackStatus.amount || 0,
        currency: 'RWF', // Paypack primarily operates in RWF
        transactionId,
        reference: paypackStatus.ref || transactionId,
        completedAt: paymentStatus === PaymentStatus.SUCCESSFUL && paypackStatus.created_at 
          ? new Date(paypackStatus.created_at) 
          : undefined,
        failureReason: paymentStatus === PaymentStatus.FAILED ? 'Payment failed' : undefined
      };

    } catch (error) {
      console.error(`Error verifying payment ${transactionId}:`, error);

      return {
        isValid: false,
        status: PaymentStatus.FAILED,
        amount: 0,
        currency: paymentConfig.defaultCurrency,
        transactionId,
        reference: '',
        failureReason: error instanceof Error ? error.message : 'Verification failed'
      };
    }
  }

  /**
   * Validate payment request before processing
   */
  private validatePaymentRequest(request: PaymentRequest): void {
    if (!request.amount || request.amount <= 0) {
      throw new Error('Payment amount must be greater than 0');
    }

    if (request.amount > 10000000) { // 10M RWF limit for Paypack
      throw new Error('Payment amount exceeds maximum limit');
    }

    if (request.amount < 100) { // Minimum 100 RWF
      throw new Error('Payment amount below minimum limit');
    }

    if (!request.phoneNumber) {
      throw new Error('Phone number is required for Paypack payments');
    }

    if (!request.reference) {
      throw new Error('Payment reference is required');
    }

    if (!request.currency) {
      throw new Error('Currency is required');
    }

    if (request.currency !== 'RWF') {
      throw new Error('Paypack currently only supports RWF currency');
    }

    if (!this.isValidPhoneNumber(request.phoneNumber)) {
      throw new Error('Invalid phone number format for Paypack payment');
    }
  }

  /**
   * Validate and format phone number for Paypack API
   */
  private formatPhoneNumber(phoneNumber: string): string {
    // Remove all non-numeric characters
    let cleaned = phoneNumber.replace(/\D/g, '');

    // Handle different phone number formats for Rwanda
    if (cleaned.startsWith('25078') || cleaned.startsWith('25079') || cleaned.startsWith('25072') || cleaned.startsWith('25073')) {
      // Already in international format (MTN: 078/079, Airtel: 072/073)
      return cleaned.slice(2);
    } else if (cleaned.startsWith('078') || cleaned.startsWith('079') || cleaned.startsWith('072') || cleaned.startsWith('073')) {
      // Local format, add country code
      return cleaned;
    } else if (cleaned.startsWith('78') || cleaned.startsWith('79') || cleaned.startsWith('72') || cleaned.startsWith('73')) {
      // Short format, add full prefix
      return cleaned;
    }

    // Return as-is if format is unclear (will be validated by Paypack API)
    return cleaned.slice(2);
  }

  /**
   * Validate phone number format for supported networks
   */
  private isValidPhoneNumber(phoneNumber: string): boolean {
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // Rwanda mobile numbers: 
    // MTN: 078xxxxxxx or 079xxxxxxx
    // Airtel: 072xxxxxxx or 073xxxxxxx
    // With or without country code (250)
    const rwandaMobileRegex = /^(25)?(078|079|072|073)\d{7}$/;
    
    return rwandaMobileRegex.test(cleaned);
  }

  /**
   * Map Paypack API status to our internal payment status
   */
  private mapPaypackStatusToPaymentStatus(paypackStatus: string): PaymentStatus {
    switch (paypackStatus?.toLowerCase()) {
      case 'pending':
        return PaymentStatus.PENDING;
      case 'successful':
      case 'success':
      case 'completed':
        return PaymentStatus.SUCCESSFUL;
      case 'failed':
      case 'failure':
      case 'error':
        return PaymentStatus.FAILED;
      default:
        console.warn(`Unknown Paypack status: ${paypackStatus}, defaulting to PENDING`);
        return PaymentStatus.PENDING;
    }
  }

  /**
   * Get user-friendly error message
   */
  private getErrorMessage(error: any): string {
    if (error.message) {
      // Check for common Paypack error patterns
      if (error.message.includes('insufficient funds') || error.message.includes('insufficient balance')) {
        return 'Insufficient funds in mobile money account';
      }
      if (error.message.includes('invalid number') || error.message.includes('account not found')) {
        return 'Mobile money account not found or invalid';
      }
      if (error.message.includes('timeout') || error.message.includes('network')) {
        return 'Payment request timed out. Please try again.';
      }
      if (error.message.includes('unauthorized') || error.message.includes('authentication')) {
        return 'Payment service authentication failed. Please contact support.';
      }
      if (error.message.includes('rate limit')) {
        return 'Too many payment requests. Please wait a moment and try again.';
      }
      if (error.message.includes('duplicate')) {
        return 'Duplicate payment detected. Please check your transaction history.';
      }
    }

    return 'Payment failed. Please check your mobile money account and try again.';
  }

  /**
   * Test the payment provider connectivity
   */
  async testConnection(): Promise<boolean> {
    try {
      return await this.paypackClient.testConnection();
    } catch (error) {
      console.error('Paypack provider connection test failed:', error);
      return false;
    }
  }

  /**
   * Get provider information
   */
  getProviderInfo() {
    return {
      name: 'Paypack',
      supportedCurrencies: ['RWF'],
      environment: this.config.environment || 'development',
      requiresPhoneNumber: true,
      maxAmount: 10000000, // 10M RWF
      minAmount: 100, // 100 RWF
      supportedNetworks: ['MTN Mobile Money', 'Airtel Money'],
      features: ['instant_payments', 'payment_verification', 'refunds']
    };
  }

  /**
   * Get supported mobile networks information
   */
  getSupportedNetworks() {
    return [
      {
        name: 'MTN Mobile Money',
        prefixes: ['078', '079'],
        description: 'MTN Rwanda Mobile Money service'
      },
      {
        name: 'Airtel Money',
        prefixes: ['072', '073'],
        description: 'Airtel Rwanda Mobile Money service'
      }
    ];
  }
} 