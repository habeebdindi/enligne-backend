import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../middlewares/error.middleware';

// Update profile schema
export const updateProfileSchema = z.object({
  businessName: z.string().min(2, 'Business name must be at least 2 characters').optional(),
  description: z.string().min(10, 'Description must be at least 10 characters').optional(),
  logo: z.string().url('Logo must be a valid URL').optional(),
  coverImage: z.string().url('Cover image must be a valid URL').optional(),
  address: z.string().min(5, 'Address must be at least 5 characters').optional(),
  businessPhone: z.string().min(10, 'Business phone must be at least 10 characters').optional(),
  businessEmail: z.string().email('Business email must be a valid email').optional()
});

// Update online status schema
export const updateOnlineStatusSchema = z.object({
  isActive: z.boolean()
});

// Update push notification settings schema
export const updatePushNotificationSettingsSchema = z.object({
  pushNotificationsEnabled: z.boolean()
});

// Update personal details schema
export const updatePersonalDetailsSchema = z.object({
  email: z.string().email('Invalid email format').optional(),
  phone: z.string().min(10, 'Phone number must be at least 10 characters').optional(),
  fullName: z.string().min(3, 'Full name must be at least 3 characters').optional(),
});

// Update order status schema
export const updateOrderStatusSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED', 'REFUNDED'])
});

// Validation middleware generator
export const validate = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));
        
        next(new ApiError(400, 'Validation failed', true));
      } else {
        next(error);
      }
    }
  };
};

// Export specific validators
export const validateUpdateProfile = validate(updateProfileSchema);
export const validateUpdateOnlineStatus = validate(updateOnlineStatusSchema);
export const validateUpdatePushNotificationSettings = validate(updatePushNotificationSettingsSchema);
export const validateUpdatePersonalDetails = validate(updatePersonalDetailsSchema);
export const validateUpdateOrderStatus = validate(updateOrderStatusSchema);