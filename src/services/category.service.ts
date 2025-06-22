import { Category } from '@prisma/client';
import prisma from '../lib/prisma';
import { ApiError } from '../middlewares/error.middleware';

export class CategoryService {
  // Get all categories
  async getAllCategories(): Promise<Category[]> {
    return prisma.category.findMany({
      orderBy: {
        name: 'asc'
      }
    });
  }

  // Get category by ID
  async getCategoryById(id: string): Promise<Category> {
    const category = await prisma.category.findUnique({
      where: { id }
    });

    if (!category) {
      throw new ApiError(404, 'Category not found');
    }

    return category;
  }
} 