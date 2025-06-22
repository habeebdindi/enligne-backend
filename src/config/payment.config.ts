import { PaymentConfig } from '../types/payment.types';

/**
 * Payment Configuration Management
 * 
 * This module centralizes all payment-related configuration,
 * including MTN MoMo API credentials and settings.
 * 
 * Environment Variables Required:
 * - MOMO_ENVIRONMENT: 'sandbox' | 'production'
 * - MOMO_SUBSCRIPTION_KEY: Primary subscription key from MTN Developer Portal
 * - MOMO_API_USER: API User ID (UUID format)
 * - MOMO_API_KEY: API Key (UUID format) 
 * - MOMO_COLLECTION_PRIMARY_KEY: Collections subscription key
 * - MOMO_COLLECTION_SECONDARY_KEY: Collections secondary key
 * - MOMO_TARGET_ENVIRONMENT: Target environment (usually matches MOMO_ENVIRONMENT)
 * - MOMO_CALLBACK_URL: Webhook URL for payment notifications
 * - WEBHOOK_SECRET: Secret for webhook signature verification
 */

const requiredEnvVars = [
  'MOMO_SUBSCRIPTION_KEY',
  'MOMO_API_USER', 
  'MOMO_API_KEY',
  'MOMO_COLLECTION_PRIMARY_KEY',
  'WEBHOOK_SECRET'
] as const;

// Validate required environment variables
function validateConfig(): void {
  const missing = requiredEnvVars.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables for MoMo integration: ${missing.join(', ')}\n` +
      'Please check your .env file and ensure all MoMo configuration is set.'
    );
  }

  // Validate UUID format for API credentials
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  
  if (!uuidRegex.test(process.env.MOMO_API_USER!)) {
    throw new Error('MOMO_API_USER must be a valid UUID format');
  }
  
  if (!uuidRegex.test(process.env.MOMO_API_KEY!)) {
    throw new Error('MOMO_API_KEY must be a valid UUID format');
  }
}

// Validate configuration on module load
if (process.env.NODE_ENV !== 'test') {
  // svalidateConfig();
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

/**
 * Development helper for environment setup
 */
export const getRequiredEnvVarsInfo = () => {
  return {
    description: 'Required environment variables for MTN MoMo integration',
    variables: {
      'MOMO_ENVIRONMENT': 'Environment type (sandbox/production)',
      'MOMO_SUBSCRIPTION_KEY': 'Primary subscription key from MTN Developer Portal',
      'MOMO_API_USER': 'API User ID in UUID format',
      'MOMO_API_KEY': 'API Key in UUID format',
      'MOMO_COLLECTION_PRIMARY_KEY': 'Collections subscription key',
      'MOMO_COLLECTION_SECONDARY_KEY': 'Collections secondary key (optional)',
      'MOMO_TARGET_ENVIRONMENT': 'Target environment (optional, defaults to MOMO_ENVIRONMENT)',
      'MOMO_CALLBACK_URL': 'Webhook URL for payment notifications (optional)',
      'WEBHOOK_SECRET': 'Secret for webhook signature verification',
      'DEFAULT_CURRENCY': 'Default currency code (optional, defaults to RWF)',
      'PAYMENT_MAX_RETRIES': 'Maximum retry attempts (optional, defaults to 3)',
      'PAYMENT_TIMEOUT_MINUTES': 'Payment timeout in minutes (optional, defaults to 15)'
    },
    setupInstructions: [
      '1. Register at https://momodeveloper.mtn.com/',
      '2. Create an application and get subscription keys',
      '3. Generate API User and API Key using the provisioning API',
      '4. Set up webhook endpoint for payment callbacks',
      '5. Configure environment variables in your .env file'
    ]
  };
}; 