import { PaymentConfig } from '../types/payment.types';

/**
 * Payment Configuration Management
 * 
 * This module centralizes all payment-related configuration,
 * including MTN MoMo and Paypack API credentials and settings.
 * 
 * Environment Variables Required:
 * 
 * MTN MoMo:
 * - MOMO_ENVIRONMENT: 'sandbox' | 'production'
 * - MOMO_SUBSCRIPTION_KEY: Primary subscription key from MTN Developer Portal
 * - MOMO_API_USER: API User ID (UUID format)
 * - MOMO_API_KEY: API Key (UUID format) 
 * - MOMO_COLLECTION_PRIMARY_KEY: Collections subscription key
 * - MOMO_COLLECTION_SECONDARY_KEY: Collections secondary key
 * - MOMO_TARGET_ENVIRONMENT: Target environment (usually matches MOMO_ENVIRONMENT)
 * - MOMO_CALLBACK_URL: Webhook URL for payment notifications
 * 
 * Paypack:
 * - PAYPACK_ENVIRONMENT: 'development' | 'production'
 * - PAYPACK_CLIENT_ID: Client ID from Paypack dashboard
 * - PAYPACK_CLIENT_SECRET: Client secret from Paypack dashboard
 * - PAYPACK_CALLBACK_URL: Webhook URL for payment notifications
 * 
 * General:
 * - WEBHOOK_SECRET: Secret for webhook signature verification
 */

const requiredEnvVars = [
  'MOMO_SUBSCRIPTION_KEY',
  'MOMO_API_USER', 
  'MOMO_API_KEY',
  'MOMO_COLLECTION_PRIMARY_KEY',
  'PAYPACK_CLIENT_ID',
  'PAYPACK_CLIENT_SECRET',
  'WEBHOOK_SECRET'
] as const;

// Validate required environment variables
function validateConfig(): void {
  const missing = requiredEnvVars.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables for payment integration: ${missing.join(', ')}\n` +
      'Please check your .env file and ensure all payment provider configurations are set.'
    );
  }

  // Validate UUID format for MoMo API credentials
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  
  if (!uuidRegex.test(process.env.MOMO_API_USER!)) {
    throw new Error('MOMO_API_USER must be a valid UUID format');
  }

}

// Validate configuration on module load
if (process.env.NODE_ENV !== 'test') {
  validateConfig();
}

export const paymentConfig: PaymentConfig = {
  momo: {
    environment: (process.env.MOMO_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox',
    subscriptionKey: process.env.MOMO_SUBSCRIPTION_KEY!,
    apiUser: process.env.MOMO_API_USER!,
    apiKey: process.env.MOMO_API_KEY!,
    collectionPrimaryKey: process.env.MOMO_COLLECTION_PRIMARY_KEY!,
    collectionSecondaryKey: process.env.MOMO_COLLECTION_SECONDARY_KEY || process.env.MOMO_COLLECTION_PRIMARY_KEY!,
    targetEnvironment: process.env.MOMO_TARGET_ENVIRONMENT || process.env.MOMO_ENVIRONMENT || 'sandbox',
    callbackUrl: process.env.MOMO_CALLBACK_URL || `${process.env.BASE_URL || 'http://localhost:3000'}/api/payments/webhook/momo`
  },
  paypack: {
    environment: (process.env.PAYPACK_ENVIRONMENT as 'development' | 'production') || 'development',
    clientId: process.env.PAYPACK_CLIENT_ID!,
    clientSecret: process.env.PAYPACK_CLIENT_SECRET!,
    callbackUrl: process.env.PAYPACK_CALLBACK_URL || `${process.env.BASE_URL || 'http://localhost:3000'}/api/payments/webhook/paypack`
  },
  defaultCurrency: process.env.DEFAULT_CURRENCY || 'RWF',
  webhookSecret: process.env.WEBHOOK_SECRET!,
  maxRetryAttempts: parseInt(process.env.PAYMENT_MAX_RETRIES || '3'),
  paymentTimeout: parseInt(process.env.PAYMENT_TIMEOUT_MINUTES || '15')
};

// API endpoints for MTN MoMo
export const getMoMoBaseUrl = (environment: 'sandbox' | 'production'): string => {
  return environment === 'production' 
    ? 'https://ericssonbasicapi2.azure-api.net'
    : 'https://sandbox.momodeveloper.mtn.com';
};

export const moMoEndpoints = {
  token: '/collection/token/',
  requestToPay: '/collection/v1_0/requesttopay',
  paymentStatus: (referenceId: string) => `/collection/v1_0/requesttopay/${referenceId}`,
  accountBalance: '/collection/v1_0/account/balance',
  accountDetails: (accountHolderIdType: string, accountHolderId: string) => 
    `/collection/v1_0/accountholder/${accountHolderIdType}/${accountHolderId}/basicuserinfo`
} as const;

// API endpoints for Paypack
export const getPaypackBaseUrl = (environment: 'development' | 'production'): string => {
  return 'https://payments.paypack.rw/api';
};

export const paypackEndpoints = {
  auth: '/auth/agents/authorize',
  cashin: '/transactions/cashin',
  cashout: '/transactions/cashout',
  transaction: (ref: string) => `/transactions/${ref}`,
  transactions: '/transactions',
  events: '/events',
  profile: '/me'
} as const;

/**
 * Development helper for environment setup
 */
export const getRequiredEnvVarsInfo = () => {
  return {
    description: 'Required environment variables for payment integrations',
    variables: {
      // MTN MoMo
      'MOMO_ENVIRONMENT': 'Environment type (sandbox/production)',
      'MOMO_SUBSCRIPTION_KEY': 'Primary subscription key from MTN Developer Portal',
      'MOMO_API_USER': 'API User ID in UUID format',
      'MOMO_API_KEY': 'API Key in UUID format',
      'MOMO_COLLECTION_PRIMARY_KEY': 'Collections subscription key',
      'MOMO_COLLECTION_SECONDARY_KEY': 'Collections secondary key (optional)',
      'MOMO_TARGET_ENVIRONMENT': 'Target environment (optional, defaults to MOMO_ENVIRONMENT)',
      'MOMO_CALLBACK_URL': 'Webhook URL for payment notifications (optional)',
      
      // Paypack
      'PAYPACK_ENVIRONMENT': 'Environment type (development/production)',
      'PAYPACK_CLIENT_ID': 'Client ID from Paypack dashboard',
      'PAYPACK_CLIENT_SECRET': 'Client secret from Paypack dashboard',
      'PAYPACK_CALLBACK_URL': 'Webhook URL for payment notifications (optional)',
      
      // General
      'WEBHOOK_SECRET': 'Secret for webhook signature verification',
      'DEFAULT_CURRENCY': 'Default currency code (optional, defaults to RWF)',
      'PAYMENT_MAX_RETRIES': 'Maximum retry attempts (optional, defaults to 3)',
      'PAYMENT_TIMEOUT_MINUTES': 'Payment timeout in minutes (optional, defaults to 15)'
    },
    setupInstructions: [
      '1. MTN MoMo: Register at https://momodeveloper.mtn.com/',
      '2. MTN MoMo: Create an application and get subscription keys',
      '3. MTN MoMo: Generate API User and API Key using the provisioning API',
      '4. Paypack: Register at https://paypack.rw/',
      '5. Paypack: Create an application and get client_id and client_secret',
      '6. Set up webhook endpoints for payment callbacks',
      '7. Configure environment variables in your .env file'
    ]
  };
}; 