import { Request, Response } from 'express';
import { CategoryService } from '../services/category.service';
import { asyncHandler } from '../middlewares/error.middleware';

// Initialize service
const categoryService = new CategoryService();

// Get all categories
export const getAllCategories = asyncHandler(async (req: Request, res: Response) => {
  const categories = await categoryService.getAllCategories();
  
  res.status(200).json({
    status: 'success',
    data: {
      categories
    }
  });
});

// Get category by ID
export const getCategoryById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  const category = await categoryService.getCategoryById(id);
  
  res.status(200).json({
    status: 'success',
    data: {
      category
    }
  });
}); 