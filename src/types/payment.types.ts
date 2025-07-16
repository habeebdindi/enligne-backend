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

// Paypack-specific types
export interface PaypackCashinRequest {
  number: string;
  amount: number;
}

export interface PaypackCashoutRequest {
  number: string;
  amount: number;
}

export interface PaypackTransactionResponse {
  ref: string;
  status: 'pending' | 'successful' | 'failed';
  message?: string;
  data?: {
    ref: string;
    kind: 'CASHIN' | 'CASHOUT';
    phone: string;
    amount: number;
    currency: string;
    status: string;
    created_at: string;
    updated_at: string;
  };
}

export interface PaypackTransactionStatus {
  ref: string;
  kind: 'CASHIN' | 'CASHOUT';
  phone: string;
  amount: number;
  currency: string;
  status: 'pending' | 'successful' | 'failed';
  created_at: string;
  updated_at: string;
  fee?: number;
}

export interface PaypackWebhookPayload {
  ref: string;
  status: 'pending' | 'successful' | 'failed';
  kind: 'CASHIN' | 'CASHOUT';
  phone: string;
  amount: number;
  currency: string;
  created_at: string;
  updated_at: string;
  fee?: number;
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
  PAYPACK = 'PAYPACK',
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

export interface PaypackConfig {
  environment: 'development' | 'production';
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
}

export interface PaymentConfig {
  momo: MoMoConfig;
  paypack: PaypackConfig;
  defaultCurrency: string;
  webhookSecret: string;
  maxRetryAttempts: number;
  paymentTimeout: number; // in minutes
}

// ============================================
// DISBURSEMENT TYPES
// ============================================

export enum DisbursementType {
  MERCHANT_PAYOUT = 'MERCHANT_PAYOUT',        // Pay merchants for their sales
  CUSTOMER_REFUND = 'CUSTOMER_REFUND',        // Refund customers
  ADMIN_PAYOUT = 'ADMIN_PAYOUT',              // Manual administrative payouts
  COMMISSION_PAYOUT = 'COMMISSION_PAYOUT',    // Commission payments
  BONUS_PAYOUT = 'BONUS_PAYOUT'               // Bonus or incentive payments
}

export enum DisbursementStatus {
  PENDING = 'PENDING',           // Created but not yet processed
  APPROVED = 'APPROVED',         // Approved for processing
  PROCESSING = 'PROCESSING',     // Being processed by payment provider
  SUCCESSFUL = 'SUCCESSFUL',     // Successfully completed
  FAILED = 'FAILED',            // Failed to process
  CANCELLED = 'CANCELLED',      // Cancelled by admin
  REJECTED = 'REJECTED'         // Rejected during approval
}

export interface DisbursementRequest {
  type: DisbursementType;
  amount: number;
  currency: string;
  phoneNumber: string;
  recipientName: string;
  reference?: string;
  description: string;
  metadata?: Record<string, any>;
  scheduledFor?: Date;
  requiresApproval?: boolean;
}

export interface DisbursementResponse {
  success: boolean;
  disbursementId: string;
  transactionId?: string;
  reference: string;
  status: DisbursementStatus;
  message?: string;
  estimatedCompletionTime?: Date;
  metadata?: Record<string, any>;
}

export interface DisbursementVerificationResult {
  isValid: boolean;
  status: DisbursementStatus;
  amount: number;
  currency: string;
  disbursementId: string;
  transactionId?: string;
  reference: string;
  recipientPhone: string;
  completedAt?: Date;
  failureReason?: string;
  providerResponse?: Record<string, any>;
}

export interface BulkDisbursementRequest {
  disbursements: DisbursementRequest[];
  description: string;
  scheduledFor?: Date;
  requiresApproval?: boolean;
  metadata?: Record<string, any>;
}

export interface BulkDisbursementResponse {
  success: boolean;
  batchId: string;
  totalDisbursements: number;
  successfulDisbursements: number;
  failedDisbursements: number;
  disbursements: DisbursementResponse[];
  metadata?: Record<string, any>;
}

export interface DisbursementFilters {
  type?: DisbursementType;
  status?: DisbursementStatus;
  recipientPhone?: string;
  startDate?: Date;
  endDate?: Date;
  minAmount?: number;
  maxAmount?: number;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'amount' | 'status';
  sortOrder?: 'asc' | 'desc';
}

export interface DisbursementStats {
  totalDisbursements: number;
  totalAmount: number;
  successfulDisbursements: number;
  failedDisbursements: number;
  pendingDisbursements: number;
  successRate: number;
  averageAmount: number;
  totalFees: number;
  byType: Record<DisbursementType, {
    count: number;
    amount: number;
  }>;
  byStatus: Record<DisbursementStatus, {
    count: number;
    amount: number;
  }>;
}

export interface DisbursementApprovalRequest {
  disbursementIds: string[];
  approvalNote?: string;
  action: 'APPROVE' | 'REJECT';
}

export interface DisbursementApprovalResponse {
  success: boolean;
  processedCount: number;
  approvedCount: number;
  rejectedCount: number;
  results: Array<{
    disbursementId: string;
    status: DisbursementStatus;
    message?: string;
  }>;
}

export interface MerchantPayoutSummary {
  merchantId: string;
  merchantName: string;
  totalOrders: number;
  totalSales: number;
  platformFee: number;
  netAmount: number;
  lastPayoutDate?: Date;
  pendingAmount: number;
}

 