import { z } from 'zod';
import { DisbursementType } from '../types/payment.types';

/**
 * Disbursement Validation Schemas
 * 
 * Comprehensive validation for all disbursement-related operations
 */

// Phone number validation for Rwanda
const phoneNumberSchema = z.string()
  .min(10, 'Phone number must be at least 10 digits')
  .max(15, 'Phone number must not exceed 15 digits')
  .regex(/^(\+?25[0-9]|0)[0-9]{8,9}$/, 'Invalid phone number format. Use +250XXXXXXXXX or 078XXXXXXXX');

// Amount validation
const amountSchema = z.number()
  .min(100, 'Minimum disbursement amount is 100 RWF')
  .max(10000000, 'Maximum disbursement amount is 10,000,000 RWF')
  .positive('Amount must be positive');

// Currency validation
const currencySchema = z.string()
  .length(3, 'Currency code must be 3 characters')
  .default('RWF');

// Disbursement type validation
const disbursementTypeSchema = z.nativeEnum(DisbursementType, {
  errorMap: () => ({ 
    message: `Invalid disbursement type. Must be one of: ${Object.values(DisbursementType).join(', ')}` 
  })
});

// Create disbursement validation
export const createDisbursementSchema = z.object({
  type: disbursementTypeSchema,
  amount: amountSchema,
  currency: currencySchema.optional(),
  phoneNumber: phoneNumberSchema,
  recipientName: z.string()
    .min(2, 'Recipient name must be at least 2 characters')
    .max(100, 'Recipient name must not exceed 100 characters')
    .trim(),
  reference: z.string()
    .min(3, 'Reference must be at least 3 characters')
    .max(50, 'Reference must not exceed 50 characters')
    .regex(/^[A-Z0-9\-_]+$/, 'Reference can only contain uppercase letters, numbers, hyphens, and underscores')
    .optional(),
  description: z.string()
    .min(10, 'Description must be at least 10 characters')
    .max(500, 'Description must not exceed 500 characters')
    .trim(),
  metadata: z.record(z.any()).optional(),
  scheduledFor: z.string()
    .datetime({ message: 'Invalid date format. Use ISO 8601 format' })
    .transform(str => new Date(str))
    .refine(date => date > new Date(), {
      message: 'Scheduled date must be in the future'
    })
    .optional(),
  requiresApproval: z.boolean().optional()
});

// Bulk disbursements validation
export const createBulkDisbursementsSchema = z.object({
  disbursements: z.array(createDisbursementSchema)
    .min(1, 'At least one disbursement is required')
    .max(100, 'Maximum 100 disbursements per batch'),
  description: z.string()
    .min(10, 'Batch description must be at least 10 characters')
    .max(500, 'Batch description must not exceed 500 characters')
    .trim(),
  scheduledFor: z.string()
    .datetime({ message: 'Invalid date format. Use ISO 8601 format' })
    .transform(str => new Date(str))
    .refine(date => date > new Date(), {
      message: 'Scheduled date must be in the future'
    })
    .optional(),
  requiresApproval: z.boolean().optional(),
  metadata: z.record(z.any()).optional()
});

// Approval request validation
export const disbursementApprovalSchema = z.object({
  disbursementIds: z.array(z.string().uuid('Invalid disbursement ID format'))
    .min(1, 'At least one disbursement ID is required')
    .max(50, 'Maximum 50 disbursements can be processed at once'),
  action: z.enum(['APPROVE', 'REJECT'], {
    errorMap: () => ({ message: 'Action must be either APPROVE or REJECT' })
  }),
  approvalNote: z.string()
    .max(1000, 'Approval note must not exceed 1000 characters')
    .optional()
});

// Query parameters validation for listing disbursements
export const getDisbursementsSchema = z.object({
  type: disbursementTypeSchema.optional(),
  status: z.enum(['PENDING', 'APPROVED', 'PROCESSING', 'SUCCESSFUL', 'FAILED', 'CANCELLED', 'REJECTED']).optional(),
  recipientPhone: z.string()
    .min(3, 'Phone search must be at least 3 characters')
    .max(15, 'Phone search must not exceed 15 characters')
    .optional(),
  startDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format')
    .transform(str => new Date(str))
    .optional(),
  endDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format')
    .transform(str => new Date(str))
    .optional(),
  minAmount: z.string()
    .transform(str => Number(str))
    .pipe(z.number().min(0, 'Minimum amount must be non-negative'))
    .optional(),
  maxAmount: z.string()
    .transform(str => Number(str))
    .pipe(z.number().min(0, 'Maximum amount must be non-negative'))
    .optional(),
  page: z.string()
    .transform(str => Number(str))
    .pipe(z.number().int().min(1, 'Page must be at least 1'))
    .default('1'),
  limit: z.string()
    .transform(str => Number(str))
    .pipe(z.number().int().min(1, 'Limit must be at least 1').max(100, 'Limit must not exceed 100'))
    .default('20'),
  sortBy: z.enum(['createdAt', 'amount', 'status']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
}).refine(data => {
  if (data.startDate && data.endDate) {
    return data.startDate <= data.endDate;
  }
  return true;
}, {
  message: 'Start date must be before or equal to end date',
  path: ['endDate']
}).refine(data => {
  if (data.minAmount && data.maxAmount) {
    return data.minAmount <= data.maxAmount;
  }
  return true;
}, {
  message: 'Minimum amount must be less than or equal to maximum amount',
  path: ['maxAmount']
});

// Stats query validation
export const getDisbursementStatsSchema = z.object({
  startDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format')
    .transform(str => new Date(str))
    .optional(),
  endDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format')
    .transform(str => new Date(str))
    .optional()
}).refine(data => {
  if (data.startDate && data.endDate) {
    return data.startDate <= data.endDate;
  }
  return true;
}, {
  message: 'Start date must be before or equal to end date',
  path: ['endDate']
});

// UUID parameter validation
export const uuidParamSchema = z.object({
  id: z.string().uuid('Invalid disbursement ID format')
});

// Type definitions for validated data
export type CreateDisbursementInput = z.infer<typeof createDisbursementSchema>;
export type CreateBulkDisbursementsInput = z.infer<typeof createBulkDisbursementsSchema>;
export type DisbursementApprovalInput = z.infer<typeof disbursementApprovalSchema>;
export type GetDisbursementsInput = z.infer<typeof getDisbursementsSchema>;
export type GetDisbursementStatsInput = z.infer<typeof getDisbursementStatsSchema>;
export type UuidParamInput = z.infer<typeof uuidParamSchema>;

// Validation middleware factory
export const validateDisbursement = (schema: z.ZodSchema) => {
  return (req: any, res: any, next: any) => {
    try {
      const validationData = schema.parse(req.body);
      req.body = validationData;
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

// Query validation middleware factory
export const validateDisbursementQuery = (schema: z.ZodSchema) => {
  return (req: any, res: any, next: any) => {
    try {
      const validationData = schema.parse(req.query);
      req.query = validationData;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          status: 'error',
          message: 'Query validation failed',
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

// Params validation middleware factory
export const validateDisbursementParams = (schema: z.ZodSchema) => {
  return (req: any, res: any, next: any) => {
    try {
      const validationData = schema.parse(req.params);
      req.params = validationData;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          status: 'error',
          message: 'Parameter validation failed',
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