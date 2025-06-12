import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../middlewares/error.middleware';

// Create product review schema
export const createProductReviewSchema = z.object({
  productId: z.string().uuid('Invalid product ID format'),
  rating: z.number().int().min(1, 'Rating must be at least 1').max(5, 'Rating must be at most 5'),
  comment: z.string().min(3, 'Comment must be at least 3 characters').optional(),
  images: z.array(z.string().url('Invalid image URL format')).optional()
});

// Get product reviews query parameters schema
export const getProductReviewsSchema = z.object({
  page: z.string().regex(/^\d+$/, 'Page must be a positive number').transform(Number).optional(),
  limit: z.string().regex(/^\d+$/, 'Limit must be a positive number').transform(Number).optional(),
  rating: z.string().regex(/^[1-5]$/, 'Rating filter must be between 1 and 5').transform(Number).optional(),
  sortBy: z.enum(['rating', 'createdAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional()
});

// UUID parameter validation schema
export const uuidParamSchema = z.object({
  id: z.string().uuid('Invalid ID format')
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

// Query parameter validation middleware generator
export const validateQuery = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));
        
        next(new ApiError(400, 'Query validation failed', true));
      } else {
        next(error);
      }
    }
  };
};

// Parameter validation middleware generator
export const validateParams = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.params = schema.parse(req.params);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));
        
        next(new ApiError(400, 'Parameter validation failed', true));
      } else {
        next(error);
      }
    }
  };
}; 