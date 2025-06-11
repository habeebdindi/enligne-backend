import { Router } from 'express';
import { HomeController } from '../controllers/home.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();
const homeController = new HomeController();

/**
 * @swagger
 * tags:
 *   name: Home
 *   description: Home page and general browsing endpoints
 */

/**
 * @swagger
 * /home/locations:
 *   get:
 *     summary: Get all available locations
 *     tags: [Home]
 *     responses:
 *       200:
 *         description: List of locations retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       name:
 *                         type: string
 *                       location:
 *                         type: object
 *                         properties:
 *                           lat:
 *                             type: number
 *                           lng:
 *                             type: number
 */
router.get('/locations', homeController.getLocations);

/**
 * @swagger
 * /home/categories:
 *   get:
 *     summary: Get all product categories
 *     tags: [Home]
 *     responses:
 *       200:
 *         description: List of categories retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Category'
 */
router.get('/categories', homeController.getCategories);

/**
 * @swagger
 * /home/search:
 *   get:
 *     summary: Search for merchants, products, or categories
 *     tags: [Home]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search query (searches in business names, descriptions, and product names)
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category name
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *         description: Filter by location (searches in address)
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [merchant, product, category]
 *         description: Type of search - returns merchants (default), products, or categories
 *     responses:
 *       200:
 *         description: Search results retrieved successfully. Returns merchants by default, products when type=product, or categories when type=category
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 oneOf:
 *                   - $ref: '#/components/schemas/Merchant'
 *                   - $ref: '#/components/schemas/Product'
 *                   - $ref: '#/components/schemas/Category'
 */
router.get('/search', homeController.search);

/**
 * @swagger
 * /home/merchants:
 *   get:
 *     summary: Get list of merchants
 *     tags: [Home]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category ID
 *       - in: query
 *         name: rating
 *         schema:
 *           type: number
 *         description: Filter by minimum rating
 *       - in: query
 *         name: isVerified
 *         schema:
 *           type: boolean
 *         description: Filter by verification status
 *     responses:
 *       200:
 *         description: List of merchants retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Merchant'
 */
router.get('/merchants', homeController.getMerchants);

/**
 * @swagger
 * /home/merchants/{id}:
 *   get:
 *     summary: Get merchant details
 *     tags: [Home]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Merchant ID
 *     responses:
 *       200:
 *         description: Merchant details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/Merchant'
 *       404:
 *         description: Merchant not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/merchants/:id', homeController.getMerchantDetails);

/**
 * @swagger
 * /home/offers:
 *   get:
 *     summary: Get active offers and promotions
 *     tags: [Home]
 *     responses:
 *       200:
 *         description: List of offers retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Offer'
 */
router.get('/offers', homeController.getOffers);

/**
 * @swagger
 * /home/recommendations:
 *   get:
 *     summary: Get personalized recommendations
 *     tags: [Home]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Recommendations retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Merchant'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/recommendations', authenticate, homeController.getRecommendations);

/**
 * @swagger
 * /home/favorites:
 *   get:
 *     summary: Get user's favorite merchants
 *     tags: [Home]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Favorites retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Merchant'
 *   post:
 *     summary: Add merchant to favorites
 *     tags: [Home]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - merchantId
 *             properties:
 *               merchantId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Merchant added to favorites successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Merchant not found
 * /home/favorites/{id}:
 *   delete:
 *     summary: Remove merchant from favorites
 *     tags: [Home]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Merchant ID
 *     responses:
 *       200:
 *         description: Merchant removed from favorites successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Merchant not found
 */
router.get('/favorites', authenticate, homeController.getFavorites);
router.post('/favorites', authenticate, homeController.addToFavorites);
router.delete('/favorites/:id', authenticate, homeController.removeFromFavorites);

/**
 * @swagger
 * /home/explore:
 *   get:
 *     summary: Get explore options (malls, markets, etc.)
 *     tags: [Home]
 *     responses:
 *       200:
 *         description: Explore options retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ExploreOption'
 */
router.get('/explore', homeController.getExploreOptions);

export default router; 