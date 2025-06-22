import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../middlewares/error.middleware';

// Validation schemas
const updateProfileSchema = z.object({
  businessName: z.string().min(2, "Business name must be at least 2 characters").max(100, "Business name must be less than 100 characters").optional(),
  description: z.string().max(500, "Description must be less than 500 characters").optional(),
  logo: z.string().url("Invalid logo URL").optional(),
  coverImage: z.string().url("Invalid cover image URL").optional(),
  address: z.string().min(5, "Address must be at least 5 characters").max(200, "Address must be less than 200 characters").optional(),
  businessPhone: z.string().min(10, "Phone number must be at least 10 characters").max(15, "Phone number must be less than 15 characters").optional(),
  businessEmail: z.string().email("Invalid email format").optional()
});

const updateOnlineStatusSchema = z.object({
  isActive: z.boolean()
});

const updateOrderStatusSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED', 'REFUNDED'], {
    errorMap: () => ({ message: "Invalid order status" })
  })
});

// Validation middleware functions
export const validateUpdateProfile = (req: Request, res: Response, next: NextFunction) => {
  try {
    updateProfileSchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.errors.map(err => err.message).join(', ');
      return next(new ApiError(400, `Validation error: ${errorMessage}`));
    }
    next(error);
  }
};

export const validateUpdateOnlineStatus = (req: Request, res: Response, next: NextFunction) => {
  try {
    updateOnlineStatusSchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.errors.map(err => err.message).join(', ');
      return next(new ApiError(400, `Validation error: ${errorMessage}`));
    }
    next(error);
  }
};

export const validateUpdateOrderStatus = (req: Request, res: Response, next: NextFunction) => {
  try {
    updateOrderStatusSchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.errors.map(err => err.message).join(', ');
      return next(new ApiError(400, `Validation error: ${errorMessage}`));
    }
    next(error);
  }
};