import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../middlewares/error.middleware';

// Validation schemas
const createProductSchema = z.object({
  name: z.string().min(2, "Product name must be at least 2 characters").max(100, "Product name must be less than 100 characters"),
  price: z.number().positive("Price must be a positive number"),
  categoryId: z.string().uuid("Invalid category ID format"),
  description: z.string().max(500, "Description must be less than 500 characters").optional(),
  images: z.array(z.string().url("Invalid image URL")).min(1, "At least one image is required"),
  preparationTime: z.number().positive("Preparation time must be a positive number").optional(),
  stockQuantity: z.number().positive("Stock quantity must be a positive number").optional(),
  subcategory: z.string().max(50, "Subcategory must be less than 50 characters").optional()
});

const updateProductAvailabilitySchema = z.object({
  isAvailable: z.boolean()
});

const updateProductSchema = z.object({
  name: z.string().min(2, "Product name must be at least 2 characters").max(100, "Product name must be less than 100 characters").optional(),
  price: z.number().positive("Price must be a positive number").optional(),
  categoryId: z.string().uuid("Invalid category ID format").optional(),
  description: z.string().max(500, "Description must be less than 500 characters").optional(),
  images: z.array(z.string().url("Invalid image URL")).min(1, "At least one image is required").optional(),
  preparationTime: z.number().positive("Preparation time must be a positive number").optional(),
  stockQuantity: z.number().positive("Stock quantity must be a positive number").optional(),
  subcategory: z.string().max(50, "Subcategory must be less than 50 characters").optional(),
  isAvailable: z.boolean().optional()
});

// Validation middleware functions
export const validateCreateProduct = (req: Request, res: Response, next: NextFunction) => {
  try {
    createProductSchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.errors.map(err => err.message).join(', ');
      return next(new ApiError(400, `Validation error: ${errorMessage}`));
    }
    next(error);
  }
};

export const validateUpdateProduct = (req: Request, res: Response, next: NextFunction) => {
  try {
    updateProductSchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.errors.map(err => err.message).join(', ');
      return next(new ApiError(400, `Validation error: ${errorMessage}`));
    }
    next(error);
  }
};

export const validateUpdateProductAvailability = (req: Request, res: Response, next: NextFunction) => {
  try {
    updateProductAvailabilitySchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.errors.map(err => err.message).join(', ');
      return next(new ApiError(400, `Validation error: ${errorMessage}`));
    }
    next(error);
  }
}; 