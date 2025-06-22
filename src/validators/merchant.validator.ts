import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../middlewares/error.middleware';

// Validation schemas
const updateProfileSchema = z.object({
  businessName: z.string().min(2).max(100).optional(),
  description: z.string().max(500).optional(),
  logo: z.string().url().optional(),
  coverImage: z.string().url().optional(),
  address: z.string().min(5).max(200).optional(),
  businessPhone: z.string().regex(/^\+?[1-9]\d{1,14}$/).optional(),
  businessEmail: z.string().email().optional()
});

const updateOnlineStatusSchema = z.object({
  isActive: z.boolean()
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