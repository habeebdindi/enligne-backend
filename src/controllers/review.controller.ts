import { Request, Response } from 'express';
import { ReviewService } from '../services/review.service';
import { ApiError } from '../middlewares/error.middleware';

export class ReviewController {
  private reviewService: ReviewService;

  constructor() {
    this.reviewService = new ReviewService();
  }

  /**
   * Create a product review
   * POST /api/v1/reviews/products
   */
  createProductReview = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new ApiError(401, 'Authentication required');
      }

      const review = await this.reviewService.createProductReview(userId, req.body);
      
      res.status(201).json({
        status: 'success',
        message: 'Review created successfully',
        data: review
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          status: 'error',
          message: error.message
        });
      } else {
        res.status(500).json({
          status: 'error',
          message: 'Error creating review',
          error: process.env.NODE_ENV === 'development' ? error : undefined
        });
      }
    }
  };

  /**
   * Get all reviews for a product
   * GET /api/v1/reviews/products/:productId
   */
  getProductReviews = async (req: Request, res: Response) => {
    try {
      const { productId } = req.params;
      const query = req.query;

      const result = await this.reviewService.getProductReviews(productId, query);

      res.json({
        status: 'success',
        message: 'Reviews retrieved successfully',
        data: result
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          status: 'error',
          message: error.message
        });
      } else {
        res.status(500).json({
          status: 'error',
          message: 'Error fetching reviews',
          error: process.env.NODE_ENV === 'development' ? error : undefined
        });
      }
    }
  };

  /**
   * Get user's review for a specific product
   * GET /api/v1/reviews/products/:productId/user
   */
  getUserProductReview = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new ApiError(401, 'Authentication required');
      }

      const { productId } = req.params;
      const review = await this.reviewService.getUserProductReview(userId, productId);

      if (!review) {
        return res.status(404).json({
          status: 'error',
          message: 'Review not found'
        });
      }

      res.json({
        status: 'success',
        message: 'User review retrieved successfully',
        data: review
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          status: 'error',
          message: error.message
        });
      } else {
        res.status(500).json({
          status: 'error',
          message: 'Error fetching user review',
          error: process.env.NODE_ENV === 'development' ? error : undefined
        });
      }
    }
  };
} 