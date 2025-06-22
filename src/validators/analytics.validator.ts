import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../middlewares/error.middleware';

// Validation schema for analytics filter
const analyticsFilterSchema = z.object({
  filter: z.enum(['today', '7days', '30days', '3months']).default('7days')
});

// Validation middleware generator
export const validateAnalyticsFilter = (req: Request, res: Response, next: NextFunction) => {
  try {
    analyticsFilterSchema.parse(req.query);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));
      
      next(new ApiError(400, 'Invalid filter parameter. Must be one of: today, 7days, 30days, 3months'));
    } else {
      next(error);
    }
  }
}; 