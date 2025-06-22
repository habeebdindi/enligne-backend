import { 
  IPaymentProvider, 
  PaymentRequest, 
  PaymentResponse, 
  PaymentVerificationResult, 
  PaymentStatus,
  MoMoCollectionRequest,
  MoMoConfig
} from '../../types/payment.types';
import { moMoApiClient } from '../../lib/momo-api.client';
import { paymentConfig } from '../../config/payment.config';

/**
 * MTN MoMo Payment Provider
 * 
 * This provider implements the payment interface for MTN Mobile Money payments.
 * It handles the business logic for:
 * - Payment processing
 * - Status verification
 * - Error handling and retry logic
 * - Phone number validation
 */

export class MoMoPaymentProvider implements IPaymentProvider {
  private config: MoMoConfig;

  constructor(config?: Partial<MoMoConfig>) {
    this.config = { ...paymentConfig.momo, ...config };
  }

  /**
   * Process a payment request using MTN MoMo
   */
  async processPayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      console.log(`Processing MoMo payment for ${request.phoneNumber}, amount: ${request.amount} ${request.currency}`);

      // Validate input
      this.validatePaymentRequest(request);

      // Format phone number for MoMo API
      const formattedPhoneNumber = this.formatPhoneNumber(request.phoneNumber);

      // Validate account holder (optional but recommended)
      const isValidAccount = await moMoApiClient.validateAccountHolder(formattedPhoneNumber);
      if (!isValidAccount) {
        console.warn(`Account validation failed for ${formattedPhoneNumber}, proceeding anyway`);
      }

      // Convert amount to EUR for sandbox environment
      let amount = request.amount;
      let currency = request.currency;
      
      if (this.config.environment === 'sandbox') {
        // For sandbox, convert RWF to EUR (using a fixed rate for testing)
        // 1 EUR ≈ 1300 RWF (this is a test rate, adjust as needed)
        const rwfToEurRate = 1300;
        amount = Math.ceil(request.amount / rwfToEurRate);
        currency = 'EUR';
        
        console.log(`Converted amount for sandbox: ${amount} ${currency} (from ${request.amount} ${request.currency})`);
      }

      // Prepare MoMo collection request
      const moMoRequest: MoMoCollectionRequest = {
        amount: amount.toString(),
        currency: currency,
        externalId: request.reference,
        payer: {
          partyIdType: 'MSISDN',
          partyId: formattedPhoneNumber
        },
        payerMessage: request.description || 'Payment for order',
        payeeNote: `Order payment - ${request.reference}`
      };

      // Initiate payment with MoMo
      const moMoResponse = await moMoApiClient.requestToPay(moMoRequest);

      return {
        success: true,
        transactionId: moMoResponse.referenceId,
        reference: request.reference,
        status: this.mapMoMoStatusToPaymentStatus(moMoResponse.status),
        message: 'Payment initiated successfully. Customer will receive a prompt to approve the payment.',
        metadata: {
          moMoReferenceId: moMoResponse.referenceId,
          phoneNumber: formattedPhoneNumber,
          initiatedAt: new Date().toISOString(),
          originalAmount: request.amount,
          originalCurrency: request.currency,
          convertedAmount: amount,
          convertedCurrency: currency
        }
      };

    } catch (error) {
      console.error('MoMo payment processing failed:', error);

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
   * Verify payment status with MoMo API
   */
  async verifyPayment(transactionId: string): Promise<PaymentVerificationResult> {
    try {
      console.log(`Verifying MoMo payment status for transaction: ${transactionId}`);

      const moMoStatus = await moMoApiClient.getPaymentStatus(transactionId);

      const paymentStatus = this.mapMoMoStatusToPaymentStatus(moMoStatus.status);
      
      return {
        isValid: true,
        status: paymentStatus,
        amount: parseFloat(moMoStatus.amount),
        currency: moMoStatus.currency,
        transactionId,
        reference: moMoStatus.externalId,
        completedAt: paymentStatus === PaymentStatus.SUCCESSFUL ? new Date() : undefined,
        failureReason: moMoStatus.reason
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

    if (request.amount > 5000000) { // 5M RWF limit
      throw new Error('Payment amount exceeds maximum limit');
    }

    if (!request.phoneNumber) {
      throw new Error('Phone number is required for MoMo payments');
    }

    if (!request.reference) {
      throw new Error('Payment reference is required');
    }

    if (!request.currency) {
      throw new Error('Currency is required');
    }

    if (!this.isValidPhoneNumber(request.phoneNumber)) {
      throw new Error('Invalid phone number format for MoMo payment');
    }
  }

  /**
   * Validate and format phone number for MoMo API
   */
  private formatPhoneNumber(phoneNumber: string): string {
    // Remove all non-numeric characters
    let cleaned = phoneNumber.replace(/\D/g, '');

    // Handle different phone number formats
    if (cleaned.startsWith('25078') || cleaned.startsWith('25079')) {
      // Already in international format for Rwanda MTN
      return cleaned;
    } else if (cleaned.startsWith('078') || cleaned.startsWith('079')) {
      // Local format, add country code
      return '25' + cleaned;
    } else if (cleaned.startsWith('78') || cleaned.startsWith('79')) {
      // Short format, add full prefix
      return '250' + cleaned;
    }

    // Return as-is if format is unclear (will be validated by MoMo API)
    return cleaned;
  }

  /**
   * Validate phone number format
   */
  private isValidPhoneNumber(phoneNumber: string): boolean {
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // Rwanda MTN numbers: 078xxxxxxx or 079xxxxxxx (with or without country code)
    const rwandaMtnRegex = /^(25)?(078|079)\d{7}$/;
    
    return rwandaMtnRegex.test(cleaned);
  }

  /**
   * Map MoMo API status to our internal payment status
   */
  private mapMoMoStatusToPaymentStatus(moMoStatus: string): PaymentStatus {
    switch (moMoStatus) {
      case 'PENDING':
        return PaymentStatus.PENDING;
      case 'SUCCESSFUL':
        return PaymentStatus.SUCCESSFUL;
      case 'FAILED':
        return PaymentStatus.FAILED;
      default:
        return PaymentStatus.PENDING;
    }
  }

  /**
   * Get user-friendly error message
   */
  private getErrorMessage(error: any): string {
    if (error.message) {
      // Check for common MoMo error patterns
      if (error.message.includes('insufficient funds')) {
        return 'Insufficient funds in mobile money account';
      }
      if (error.message.includes('account not found')) {
        return 'Mobile money account not found';
      }
      if (error.message.includes('timeout')) {
        return 'Payment request timed out. Please try again.';
      }
      if (error.message.includes('invalid phone')) {
        return 'Invalid phone number for mobile money payment';
      }
    }

    return 'Payment failed. Please check your mobile money account and try again.';
  }

  /**
   * Test the payment provider connectivity
   */
  async testConnection(): Promise<boolean> {
    try {
      return await moMoApiClient.testConnection();
    } catch (error) {
      console.error('MoMo provider connection test failed:', error);
      return false;
    }
  }

  /**
   * Get provider information
   */
  getProviderInfo() {
    return {
      name: 'MTN Mobile Money',
      supportedCurrencies: ['RWF'],
      environment: paymentConfig.momo.environment,
      requiresPhoneNumber: true,
      maxAmount: 5000000, // 5M RWF
      minAmount: 100 // 100 RWF
    };
  }
} 