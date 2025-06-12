import { PrismaClient } from '@prisma/client';
import { ApiError } from '../middlewares/error.middleware';

const prisma = new PrismaClient();

export interface CreateProductReviewData {
  productId: string;
  rating: number;
  comment?: string;
  images?: string[];
}

export interface GetProductReviewsQuery {
  page?: number;
  limit?: number;
  rating?: number;
  sortBy?: 'rating' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface ReviewResponse {
  id: string;
  rating: number;
  comment: string | null;
  images: string[] | null;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    fullName: string;
  };
  product?: {
    id: string;
    name: string;
  };
}

export interface PaginatedReviewResponse {
  reviews: ReviewResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  summary: {
    averageRating: number;
    totalReviews: number;
    ratingDistribution: {
      [key: number]: number;
    };
  };
}

export class ReviewService {
  /**
   * Create a product review
   * Business rules:
   * 1. User must have purchased the product (have a delivered order with this product)
   * 2. User cannot review the same product multiple times
   * 3. Product must exist and be active
   */
  async createProductReview(userId: string, data: CreateProductReviewData): Promise<ReviewResponse> {
    // Check if product exists and is active
    const product = await prisma.product.findFirst({
      where: {
        id: data.productId,
        isAvailable: true
      }
    });

    if (!product) {
      throw new ApiError(404, 'Product not found or not available');
    }

    // First, find the customer profile for this user
    const customer = await prisma.customer.findUnique({
      where: { userId }
    });

    if (!customer) {
      throw new ApiError(404, 'Customer profile not found');
    }

    // Check if user has purchased this product (has a delivered order containing this product)
    const purchaseCheck = await prisma.orderItem.findFirst({
      where: {
        productId: data.productId,
        order: {
          customerId: customer.id,
          status: 'DELIVERED'
        }
      },
      include: {
        order: true
      }
    });

    if (!purchaseCheck) {
      throw new ApiError(403, 'You can only review products you have purchased and received');
    }

    // Check if user has already reviewed this product
    const existingReview = await prisma.review.findFirst({
      where: {
        userId,
        productId: data.productId
      }
    });

    if (existingReview) {
      throw new ApiError(409, 'You have already reviewed this product');
    }

    // Create the review
    const review = await prisma.review.create({
      data: {
        userId,
        productId: data.productId,
        rating: data.rating,
        comment: data.comment,
        images: data.images || []
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true
          }
        },
        product: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    return this.formatReviewResponse(review);
  }

  /**
   * Get all reviews for a product with pagination and filtering
   */
  async getProductReviews(productId: string, query: GetProductReviewsQuery): Promise<PaginatedReviewResponse> {
    // Set default values
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100); // Max 100 per page
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';
    const skip = (page - 1) * limit;

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      throw new ApiError(404, 'Product not found');
    }

    // Build where clause
    const whereClause: any = {
      productId,
      isPublished: true
    };

    if (query.rating) {
      whereClause.rating = query.rating;
    }

    // Get reviews with pagination
    const [reviews, totalCount] = await Promise.all([
      prisma.review.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              fullName: true
            }
          },
          product: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: {
          [sortBy]: sortOrder
        },
        skip,
        take: limit
      }),
      prisma.review.count({
        where: whereClause
      })
    ]);

    // Calculate summary statistics
    const [averageRating, ratingDistribution] = await Promise.all([
      prisma.review.aggregate({
        where: {
          productId,
          isPublished: true
        },
        _avg: {
          rating: true
        }
      }),
      prisma.review.groupBy({
        by: ['rating'],
        where: {
          productId,
          isPublished: true
        },
        _count: {
          rating: true
        }
      })
    ]);

    // Format rating distribution
    const distributionMap: { [key: number]: number } = {};
    for (let i = 1; i <= 5; i++) {
      distributionMap[i] = 0;
    }
    ratingDistribution.forEach(item => {
      distributionMap[item.rating] = item._count.rating;
    });

    const totalPages = Math.ceil(totalCount / limit);

    return {
      reviews: reviews.map(review => this.formatReviewResponse(review)),
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      summary: {
        averageRating: Number(averageRating._avg.rating?.toFixed(1)) || 0,
        totalReviews: totalCount,
        ratingDistribution: distributionMap
      }
    };
  }

  /**
   * Get user's review for a specific product
   */
  async getUserProductReview(userId: string, productId: string): Promise<ReviewResponse | null> {
    const review = await prisma.review.findFirst({
      where: {
        userId,
        productId
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true
          }
        },
        product: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    return review ? this.formatReviewResponse(review) : null;
  }

  /**
   * Format review response to ensure consistent API response
   */
  private formatReviewResponse(review: any): ReviewResponse {
    return {
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      images: review.images,
      isPublished: review.isPublished,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
      user: {
        id: review.user.id,
        fullName: review.user.fullName
      },
      product: review.product ? {
        id: review.product.id,
        name: review.product.name
      } : undefined
    };
  }
} 