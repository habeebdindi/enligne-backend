import { z } from 'zod';

/**
 * Payment Validation Schemas
 * 
 * Defines validation rules for all payment-related endpoints
 * using Zod for type-safe validation
 */

// Phone number validation for Rwanda MTN numbers
const phoneNumberSchema = z.string()
  .regex(/^(\+250|250|0)?(78|79)\d{7}$/, 'Invalid MTN phone number format')
  .transform((phone) => {
    // Normalize to international format
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('25078') || cleaned.startsWith('25079')) {
      return cleaned;
    } else if (cleaned.startsWith('078') || cleaned.startsWith('079')) {
      return '25' + cleaned;
    } else if (cleaned.startsWith('78') || cleaned.startsWith('79')) {
      return '250' + cleaned;
    }
    return cleaned;
  });

// Process payment validation
export const processPaymentSchema = z.object({
  orderId: z.string().uuid('Invalid order ID format'),
  paymentMethod: z.enum(['MOMO_PAY', 'CARD', 'CASH'], {
    errorMap: () => ({ message: 'Payment method must be MOMO_PAY, CARD, or CASH' })
  }),
  phoneNumber: z.optional(phoneNumberSchema)
}).refine((data) => {
  // Phone number is required for MoMo payments
  if (data.paymentMethod === 'MOMO_PAY' && !data.phoneNumber) {
    return false;
  }
  return true;
}, {
  message: 'Phone number is required for MoMo payments',
  path: ['phoneNumber']
});

// Verify payment validation
export const verifyPaymentSchema = z.object({
  transactionId: z.string().min(1, 'Transaction ID is required'),
  provider: z.optional(z.enum(['MOMO_PAY', 'CARD']))
});

// Payment history query validation
export const paymentHistorySchema = z.object({
  page: z.optional(
    z.string()
      .transform(Number)
      .refine((val) => val > 0, 'Page must be greater than 0')
      .default('1')
  ),
  limit: z.optional(
    z.string()
      .transform(Number)
      .refine((val) => val > 0 && val <= 100, 'Limit must be between 1 and 100')
      .default('20')
  )
});

// Retry payment validation
export const retryPaymentSchema = z.object({
  paymentId: z.string().uuid('Invalid payment ID format')
});

// MoMo webhook validation
export const moMoWebhookSchema = z.object({
  referenceId: z.string().min(1, 'Reference ID is required'),
  status: z.enum(['PENDING', 'SUCCESSFUL', 'FAILED'], {
    errorMap: () => ({ message: 'Invalid payment status' })
  }),
  financialTransactionId: z.optional(z.string()),
  reason: z.optional(z.string()),
  amount: z.optional(z.string()),
  currency: z.optional(z.string()),
  externalId: z.optional(z.string()),
  payer: z.optional(z.object({
    partyIdType: z.string(),
    partyId: z.string()
  }))
});

// Payment amount validation
export const paymentAmountSchema = z.number()
  .min(100, 'Minimum payment amount is 100 RWF')
  .max(5000000, 'Maximum payment amount is 5,000,000 RWF');

// Currency validation
export const currencySchema = z.enum(['RWF', 'USD', 'EUR'], {
  errorMap: () => ({ message: 'Unsupported currency' })
});

// Create order with payment validation (enhanced)
export const createOrderWithPaymentSchema = z.object({
  addressId: z.string().uuid('Invalid address ID format'),
  paymentMethod: z.enum(['MOMO_PAY', 'CARD', 'CASH']),
  phoneNumber: z.optional(phoneNumberSchema),
  notes: z.optional(z.string().max(500, 'Notes cannot exceed 500 characters')),
  scheduledFor: z.optional(z.string().datetime('Invalid datetime format'))
}).refine((data) => {
  if (data.paymentMethod === 'MOMO_PAY' && !data.phoneNumber) {
    return false;
  }
  return true;
}, {
  message: 'Phone number is required for MoMo payments',
  path: ['phoneNumber']
});

// Payment method selection validation
export const paymentMethodSchema = z.object({
  method: z.enum(['MOMO_PAY', 'CARD', 'CASH']),
  phoneNumber: z.optional(phoneNumberSchema),
  saveMethod: z.optional(z.boolean().default(false))
});

// Validation middleware creator
export const validateRequest = (schema: z.ZodSchema) => {
  return (req: any, res: any, next: any) => {
    try {
      const validated = schema.parse({
        ...req.body,
        ...req.params,
        ...req.query
      });
      
      // Replace request data with validated data
      req.body = { ...req.body, ...validated };
      req.params = { ...req.params, ...validated };
      req.query = { ...req.query, ...validated };
      
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          status: 'error',
          message: 'Validation failed',
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      }
      next(error);
    }
  };
};

// Export validation functions for individual use
export const validatePhoneNumber = (phone: string): boolean => {
  try {
    phoneNumberSchema.parse(phone);
    return true;
  } catch {
    return false;
  }
};

export const validatePaymentAmount = (amount: number): boolean => {
  try {
    paymentAmountSchema.parse(amount);
    return true;
  } catch {
    return false;
  }
};

export const normalizePhoneNumber = (phone: string): string => {
  try {
    return phoneNumberSchema.parse(phone);
  } catch {
    return phone;
  }
}; 