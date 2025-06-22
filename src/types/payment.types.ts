// Domain types for payment system
export interface PaymentRequest {
  amount: number;
  currency: string;
  phoneNumber: string;
  reference: string;
  description?: string;
  metadata?: Record<string, any>;
}

export interface PaymentResponse {
  success: boolean;
  transactionId: string;
  reference: string;
  status: PaymentStatus;
  message?: string;
  metadata?: Record<string, any>;
}

export interface PaymentVerificationResult {
  isValid: boolean;
  status: PaymentStatus;
  amount: number;
  currency: string;
  transactionId: string;
  reference: string;
  completedAt?: Date;
  failureReason?: string;
}

export interface MoMoCollectionRequest {
  amount: string;
  currency: string;
  externalId: string;
  payer: {
    partyIdType: 'MSISDN';
    partyId: string;
  };
  payerMessage: string;
  payeeNote: string;
}

export interface MoMoCollectionResponse {
  referenceId: string;
  status: string;
  reason?: string;
}

export interface MoMoPaymentStatus {
  amount: string;
  currency: string;
  externalId: string;
  payer: {
    partyIdType: string;
    partyId: string;
  };
  status: 'PENDING' | 'SUCCESSFUL' | 'FAILED';
  reason?: string;
  financialTransactionId?: string;
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SUCCESSFUL = 'SUCCESSFUL',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED'
}

export enum PaymentProviderType {
  MOMO_PAY = 'MOMO_PAY',
  CARD = 'CARD',
  CASH = 'CASH'
}

export interface IPaymentProvider {
  processPayment(request: PaymentRequest): Promise<PaymentResponse>;
  verifyPayment(transactionId: string): Promise<PaymentVerificationResult>;
  refundPayment?(transactionId: string, amount?: number): Promise<PaymentResponse>;
  testConnection(): Promise<boolean>;
}

export interface PaymentWebhookPayload {
  transactionId: string;
  reference: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  metadata?: Record<string, any>;
  timestamp: string;
  signature?: string;
}

// Configuration interfaces
export interface MoMoConfig {
  environment: 'sandbox' | 'production';
  subscriptionKey: string;
  apiUser: string;
  apiKey: string;
  collectionPrimaryKey: string;
  collectionSecondaryKey: string;
  callbackUrl: string;
  targetEnvironment: string;
}

export interface PaymentConfig {
  momo: MoMoConfig;
  defaultCurrency: string;
  webhookSecret: string;
  maxRetryAttempts: number;
  paymentTimeout: number; // in minutes
} 