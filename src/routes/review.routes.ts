import { Router } from 'express';
import { ReviewController } from '../controllers/review.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { 
  validate, 
  createProductReviewSchema,
} from '../validators/review.validator';

const router = Router();
const reviewController = new ReviewController();

/**
 * @swagger
 * components:
 *   schemas:
 *     CreateProductReview:
 *       type: object
 *       required:
 *         - productId
 *         - rating
 *       properties:
 *         productId:
 *           type: string
 *           format: uuid
 *           description: ID of the product being reviewed
 *         rating:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *           description: Rating from 1 to 5 stars
 *         comment:
 *           type: string
 *           minLength: 3
 *           description: Optional review comment
 *         images:
 *           type: array
 *           items:
 *             type: string
 *             format: url
 *           description: Optional array of image URLs
 *     
 *     ReviewResponse:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         rating:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *         comment:
 *           type: string
 *           nullable: true
 *         images:
 *           type: array
 *           items:
 *             type: string
 *           nullable: true
 *         isPublished:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         user:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *               format: uuid
 *             fullName:
 *               type: string
 *         product:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *               format: uuid
 *             name:
 *               type: string
 *     
 *     PaginatedReviewResponse:
 *       type: object
 *       properties:
 *         reviews:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ReviewResponse'
 *         pagination:
 *           type: object
 *           properties:
 *             page:
 *               type: integer
 *             limit:
 *               type: integer
 *             total:
 *               type: integer
 *             totalPages:
 *               type: integer
 *             hasNext:
 *               type: boolean
 *             hasPrev:
 *               type: boolean
 *         summary:
 *           type: object
 *           properties:
 *             averageRating:
 *               type: number
 *               format: float
 *             totalReviews:
 *               type: integer
 *             ratingDistribution:
 *               type: object
 *               properties:
 *                 1:
 *                   type: integer
 *                 2:
 *                   type: integer
 *                 3:
 *                   type: integer
 *                 4:
 *                   type: integer
 *                 5:
 *                   type: integer
 */

/**
 * @swagger
 * /reviews/products:
 *   post:
 *     summary: Create a product review
 *     description: |
 *       Create a review for a product. Business rules:
 *       - User must be authenticated
 *       - User must have purchased and received the product (order status: DELIVERED)
 *       - User cannot review the same product multiple times
 *       - Product must exist and be available
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateProductReview'
 *           examples:
 *             basic:
 *               summary: Basic review
 *               value:
 *                 productId: "550e8400-e29b-41d4-a716-446655440000"
 *                 rating: 5
 *                 comment: "Great product, fast delivery!"
 *             withImages:
 *               summary: Review with images
 *               value:
 *                 productId: "550e8400-e29b-41d4-a716-446655440000"
 *                 rating: 4
 *                 comment: "Good quality but could be better"
 *                 images: ["https://example.com/image1.jpg", "https://example.com/image2.jpg"]
 *     responses:
 *       201:
 *         description: Review created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Review created successfully
 *                 data:
 *                   $ref: '#/components/schemas/ReviewResponse'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 *       403:
 *         description: You can only review products you have purchased and received
 *       404:
 *         description: Product not found or not available
 *       409:
 *         description: You have already reviewed this product
 *       500:
 *         description: Internal server error
 */
router.post('/products', 
  authenticate, 
  validate(createProductReviewSchema), 
  reviewController.createProductReview
);

/**
 * @swagger
 * /reviews/products/{productId}:
 *   get:
 *     summary: Get all reviews for a product
 *     description: |
 *       Retrieve all published reviews for a specific product with pagination, filtering, and sorting.
 *       Includes review summary statistics like average rating and rating distribution.
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The product ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of reviews per page (max 100)
 *       - in: query
 *         name: rating
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *         description: Filter by specific rating (1-5 stars)
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [rating, createdAt]
 *           default: createdAt
 *         description: Sort reviews by rating or creation date
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order (ascending or descending)
 *     responses:
 *       200:
 *         description: Reviews retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Reviews retrieved successfully
 *                 data:
 *                   $ref: '#/components/schemas/PaginatedReviewResponse'
 *       404:
 *         description: Product not found
 *       500:
 *         description: Internal server error
 */
router.get('/products/:productId', 
    authenticate,
    reviewController.getProductReviews
);

/**
 * @swagger
 * /reviews/products/{productId}/user:
 *   get:
 *     summary: Get user's review for a specific product
 *     description: Get the authenticated user's review for a specific product
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The product ID
 *     responses:
 *       200:
 *         description: User review retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: User review retrieved successfully
 *                 data:
 *                   $ref: '#/components/schemas/ReviewResponse'
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Review not found
 *       500:
 *         description: Internal server error
 */
router.get('/products/:productId/user', 
  authenticate,
  reviewController.getUserProductReview
);

export default router; 