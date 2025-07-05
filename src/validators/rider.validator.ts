import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../middlewares/error.middleware';

// Toggle availability schema
export const toggleAvailabilitySchema = z.object({
  isAvailable: z.boolean(),
  currentLocation: z.object({
    lat: z.number(),
    lng: z.number()
  }).optional()
});

// Update delivery status schema
export const updateDeliveryStatusSchema = z.object({
  status: z.enum(['PENDING', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'FAILED', 'CANCELLED']),
  location: z.object({
    lat: z.number(),
    lng: z.number()
  }).optional()
});

// Update rider profile schema
export const updateRiderProfileSchema = z.object({
  vehicleType: z.string().min(1, 'Vehicle type is required').optional(),
  vehicleNumber: z.string().optional(),
  identityDoc: z.string().optional(),
  currentLocation: z.object({
    lat: z.number(),
    lng: z.number()
  }).optional()
});

// Generic validation middleware
export const validate = (schema: z.ZodSchema<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));
        
        const message = errorMessages.map(err => `${err.field}: ${err.message}`).join(', ');
        throw new ApiError(400, `Validation failed: ${message}`);
      }
      next(error);
    }
  };
};

// Specific validation middlewares
export const validateToggleAvailability = validate(toggleAvailabilitySchema);
export const validateUpdateDeliveryStatus = validate(updateDeliveryStatusSchema);
export const validateUpdateRiderProfile = validate(updateRiderProfileSchema); 