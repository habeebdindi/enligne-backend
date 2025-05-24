import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class ProductService {
  async getProductDetails(productId: string, userId?: string) {
    // Fetch product with merchant, category, and active offer
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        merchant: true,
        category: true,
        Offer: {
          where: {
            isActive: true,
            startTime: { lte: new Date() },
            endTime: { gte: new Date() }
          }
        }
      }
    });
    if (!product) return null;

    // Check if favorite (by merchant)
    let isFavorite = false;
    if (userId) {
      isFavorite = !!(await prisma.favorite.findFirst({
        where: { userId, merchantId: product.merchantId }
      }));
    }

    // Similar products (same category, exclude current)
    const similarProducts = await prisma.product.findMany({
      where: {
        categoryId: product.categoryId,
        id: { not: product.id },
        isAvailable: true
      },
      take: 6,
      select: {
        id: true,
        name: true,
        price: true,
        salePrice: true,
        images: true
      }
    });

    return {
      ...product,
      offer: product.Offer?.[0] || null,
      isFavorite,
      similarProducts
    };
  }
} 