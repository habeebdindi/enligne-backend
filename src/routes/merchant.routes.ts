import { Router } from 'express';
import { 
  getDashboard, 
  getProfile, 
  updateProfile, 
  updateOnlineStatus,
  getRecentOrders,
  getProductsSummary,
  getProducts,
  getProductSubcategories,
  createProduct,
  updateProduct,
  updateProductAvailability,
  deleteProduct,
  getOrders,
  getOrderDetails,
  updateOrderStatus
} from '../controllers/merchant.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validateUpdateProfile, validateUpdateOnlineStatus, validateUpdateOrderStatus } from '../validators/merchant.validator';
import { validateCreateProduct, validateUpdateProduct, validateUpdateProductAvailability } from '../validators/product.validator';
import { Role } from '@prisma/client';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Apply merchant authorization to all routes
router.use(authorize(Role.MERCHANT));

/**
 * @swagger
 * /merchants/dashboard:
 *   get:
 *     summary: Get merchant dashboard data
 *     description: Retrieve comprehensive dashboard data including metrics, profile info, and business statistics
 *     tags: [Merchants]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     merchant:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         businessName:
 *                           type: string
 *                           example: SLIMs Business
 *                         rating:
 *                           type: number
 *                           example: 4.8
 *                         totalReviews:
 *                           type: number
 *                           example: 25
 *                         email:
 *                           type: string
 *                         phone:
 *                           type: string
 *                         address:
 *                           type: string
 *                         isVerified:
 *                           type: boolean
 *                         isActive:
 *                           type: boolean
 *                     metrics:
 *                       type: object
 *                       properties:
 *                         totalOrders:
 *                           type: number
 *                           example: 12
 *                         totalRevenue:
 *                           type: number
 *                           example: 10000
 *                         pendingOrders:
 *                           type: number
 *                           example: 3
 *                         currentMonthRevenue:
 *                           type: number
 *                           example: 2500
 *                         currentMonthOrders:
 *                           type: number
 *                           example: 5
 *                         revenueGrowth:
 *                           type: number
 *                           example: 12.5
 *                         ordersGrowth:
 *                           type: number
 *                           example: -8.2
 *                     accountSetupProgress:
 *                       type: object
 *                       description: Account setup progress state machine
 *                       properties:
 *                         accountCreated:
 *                           type: string
 *                           enum: [completed]
 *                           example: completed
 *                           description: Always completed when merchant exists
 *                         businessVerification:
 *                           type: string
 *                           enum: [completed, pending]
 *                           example: completed
 *                           description: Completed when merchant is verified
 *                         addProduct:
 *                           type: string
 *                           enum: [completed, pending]
 *                           example: pending
 *                           description: Completed when merchant has at least one product
 *                         firstOrder:
 *                           type: string
 *                           enum: [completed, pending]
 *                           example: pending
 *                           description: Completed when merchant has received at least one order
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not a merchant
 *       404:
 *         description: Merchant profile not found
 */
router.get('/dashboard', getDashboard);

/**
 * @swagger
 * /merchants/profile:
 *   get:
 *     summary: Get merchant profile
 *     description: Retrieve detailed merchant profile information
 *     tags: [Merchants]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     merchant:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         businessName:
 *                           type: string
 *                         description:
 *                           type: string
 *                         logo:
 *                           type: string
 *                         coverImage:
 *                           type: string
 *                         address:
 *                           type: string
 *                         businessPhone:
 *                           type: string
 *                         businessEmail:
 *                           type: string
 *                         rating:
 *                           type: number
 *                         isActive:
 *                           type: boolean
 *                         isVerified:
 *                           type: boolean
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not a merchant
 *       404:
 *         description: Merchant profile not found
 */
router.get('/profile', getProfile);

/**
 * @swagger
 * /merchants/profile:
 *   put:
 *     summary: Update merchant profile
 *     description: Update merchant profile information
 *     tags: [Merchants]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               businessName:
 *                 type: string
 *                 example: SLIMs Business
 *               description:
 *                 type: string
 *                 example: Best restaurant in town
 *               logo:
 *                 type: string
 *                 example: https://example.com/logo.png
 *               coverImage:
 *                 type: string
 *                 example: https://example.com/cover.png
 *               address:
 *                 type: string
 *                 example: 123 Main Street, Kigali
 *               businessPhone:
 *                 type: string
 *                 example: +250788123456
 *               businessEmail:
 *                 type: string
 *                 example: contact@example.com
 *     responses:
 *       200:
 *         description: Profile updated successfully
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
 *                   example: Profile updated successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     merchant:
 *                       type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not a merchant
 *       404:
 *         description: Merchant profile not found
 */
router.put('/profile', validateUpdateProfile, updateProfile);

/**
 * @swagger
 * /merchants/online-status:
 *   put:
 *     summary: Update merchant online status
 *     description: Toggle merchant online/offline status
 *     tags: [Merchants]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isActive
 *             properties:
 *               isActive:
 *                 type: boolean
 *                 example: true
 *                 description: Set to true to go online, false to go offline
 *     responses:
 *       200:
 *         description: Online status updated successfully
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
 *                   example: Merchant activated successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     merchant:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         isActive:
 *                           type: boolean
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not a merchant
 *       404:
 *         description: Merchant profile not found
 */
router.put('/online-status', validateUpdateOnlineStatus, updateOnlineStatus);

/**
 * @swagger
 * /merchants/recent-orders:
 *   get:
 *     summary: Get recent orders for merchant
 *     description: Retrieve the 10 most recent orders with customer and product details
 *     tags: [Merchants]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Recent orders retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     orders:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             example: order-uuid
 *                           customerName:
 *                             type: string
 *                             example: John Doe
 *                           productName:
 *                             type: string
 *                             example: Pizza Margherita
 *                           status:
 *                             type: string
 *                             example: PENDING
 *                             enum: [PENDING, CONFIRMED, PREPARING, READY_FOR_PICKUP, PICKED_UP, IN_TRANSIT, DELIVERED, CANCELLED, REFUNDED]
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                             example: 2024-01-15T10:30:00Z
 *                           total:
 *                             type: number
 *                             example: 2500
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not a merchant
 *       404:
 *         description: Merchant profile not found
 */
router.get('/recent-orders', getRecentOrders);

/**
 * @swagger
 * /merchants/products/summary:
 *   get:
 *     summary: Get products summary for merchant
 *     description: Retrieve summary statistics for merchant products including total, available, unavailable counts and gross sales
 *     tags: [Merchants]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Products summary retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalProducts:
 *                       type: number
 *                       example: 25
 *                       description: Total number of products in merchant's catalog
 *                     availableProducts:
 *                       type: number
 *                       example: 20
 *                       description: Number of products currently available for sale
 *                     unavailableProducts:
 *                       type: number
 *                       example: 5
 *                       description: Number of products currently unavailable
 *                     grossSales:
 *                       type: number
 *                       example: 50000
 *                       description: Total gross sales amount from all completed orders
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not a merchant
 *       404:
 *         description: Merchant profile not found
 */
router.get('/products/summary', getProductsSummary);

/**
 * @swagger
 * /merchants/products:
 *   get:
 *     summary: Get all products for merchant
 *     description: Retrieve all products with sales data and filtering by subcategory
 *     tags: [Merchants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: subcategory
 *         schema:
 *           type: string
 *         description: Filter products by subcategory name
 *     responses:
 *       200:
 *         description: Products retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     products:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                             example: Pizza Margherita
 *                           price:
 *                             type: number
 *                             example: 2500
 *                           monthlySales:
 *                             type: number
 *                             example: 15
 *                           description:
 *                             type: string
 *                             example: Classic Italian pizza
 *                           isAvailable:
 *                             type: boolean
 *                             example: true
 *                           totalSales:
 *                             type: number
 *                             example: 37500
 *                           subcategory:
 *                             type: string
 *                             example: Proteins
 *                           images:
 *                             type: array
 *                             items:
 *                               type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not a merchant
 *       404:
 *         description: Merchant profile not found
 */
router.get('/products', getProducts);

/**
 * @swagger
 * /merchants/products/subcategories:
 *   get:
 *     summary: Get product subcategories for merchant
 *     description: Retrieve all subcategories used by merchant's products with product counts. Useful for filtering and organizing products by merchant-specific categories like "Proteins", "Drinks", "Tablets", etc.
 *     tags: [Merchants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: string
 *         description: Filter subcategories by category ID (optional)
 *     responses:
 *       200:
 *         description: Subcategories retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     subcategories:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                             example: Proteins
 *                             description: Subcategory name (merchant-defined)
 *                           count:
 *                             type: number
 *                             example: 5
 *                             description: Number of products in this subcategory
 *                       example:
 *                         - name: "Proteins"
 *                           count: 8
 *                         - name: "Drinks"
 *                           count: 12
 *                         - name: "Sides"
 *                           count: 6
 *                         - name: "Desserts"
 *                           count: 4
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not a merchant
 *       404:
 *         description: Merchant profile not found
 */
router.get('/products/subcategories', getProductSubcategories);

/**
 * @swagger
 * /merchants/products:
 *   post:
 *     summary: Create a new product
 *     description: Add a new product to merchant's catalog
 *     tags: [Merchants]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - price
 *               - categoryId
 *               - images
 *             properties:
 *               name:
 *                 type: string
 *                 example: Pizza Margherita
 *               price:
 *                 type: number
 *                 example: 2500
 *               categoryId:
 *                 type: string
 *                 example: category-uuid
 *               description:
 *                 type: string
 *                 example: Classic Italian pizza with tomato and mozzarella
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   example: https://example.com/pizza.jpg
 *               preparationTime:
 *                 type: number
 *                 example: 20
 *               stockQuantity:
 *                 type: number
 *                 example: 50
 *               subcategory:
 *                 type: string
 *                 example: Proteins
 *                 description: Merchant-specific subcategory (e.g., Proteins, Drinks, Tablets, Prophylaxis)
 *     responses:
 *       201:
 *         description: Product created successfully
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
 *                   example: Product created successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     product:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         price:
 *                           type: number
 *                         description:
 *                           type: string
 *                         isAvailable:
 *                           type: boolean
 *                         category:
 *                           type: string
 *                         subcategory:
 *                           type: string
 *                         images:
 *                           type: array
 *                           items:
 *                             type: string
 *       400:
 *         description: Bad request - validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not a merchant
 *       404:
 *         description: Category not found
 */
router.post('/products', validateCreateProduct, createProduct);

/**
 * @swagger
 * /merchants/products/{id}/availability:
 *   put:
 *     summary: Update product availability
 *     description: Toggle product availability (available/unavailable)
 *     tags: [Merchants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isAvailable
 *             properties:
 *               isAvailable:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Product availability updated successfully
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
 *                   example: Product activated successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     product:
 *                       type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not a merchant
 *       404:
 *         description: Product not found
 */
router.put('/products/:id/availability', validateUpdateProductAvailability, updateProductAvailability);

/**
 * @swagger
 * /merchants/products/{id}:
 *   put:
 *     summary: Update a product
 *     description: Update product details including name, price, category, description, images, and other attributes
 *     tags: [Merchants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Updated Pizza Margherita
 *                 description: Product name (optional)
 *               price:
 *                 type: number
 *                 example: 3000
 *                 description: Product price (optional)
 *               description:
 *                 type: string
 *                 example: Updated classic Italian pizza with premium ingredients
 *                 description: Product description (optional)
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   example: https://example.com/updated-pizza.jpg
 *                 description: Product images URLs (optional)
 *               preparationTime:
 *                 type: number
 *                 example: 25
 *                 description: Preparation time in minutes (optional)
 *               stockQuantity:
 *                 type: number
 *                 example: 75
 *                 description: Available stock quantity (optional)
 *               subcategory:
 *                 type: string
 *                 example: Premium Proteins
 *                 description: Merchant-specific subcategory (optional)
 *               isAvailable:
 *                 type: boolean
 *                 example: true
 *                 description: Product availability status (optional)
 *     responses:
 *       200:
 *         description: Product updated successfully
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
 *                   example: Product updated successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     product:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         price:
 *                           type: number
 *                         description:
 *                           type: string
 *                         isAvailable:
 *                           type: boolean
 *                         category:
 *                           type: string
 *                         subcategory:
 *                           type: string
 *                         images:
 *                           type: array
 *                           items:
 *                             type: string
 *                         preparationTime:
 *                           type: number
 *                         stockQuantity:
 *                           type: number
 *       400:
 *         description: Bad request - validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not a merchant
 *       404:
 *         description: Product or category not found
 */
router.put('/products/:id', validateUpdateProduct, updateProduct);

/**
 * @swagger
 * /merchants/products/{id}:
 *   delete:
 *     summary: Delete a product
 *     description: Remove a product from merchant's catalog (only if no orders exist)
 *     tags: [Merchants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product deleted successfully
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
 *                   example: Product deleted successfully
 *       400:
 *         description: Bad request - product has orders
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not a merchant
 *       404:
 *         description: Product not found
 */
router.delete('/products/:id', deleteProduct);

/**
 * @swagger
 * /merchants/orders:
 *   get:
 *     summary: Get all orders for merchant
 *     description: Retrieve all orders with customer details, items, and filtering by status
 *     tags: [Merchants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, CONFIRMED, PREPARING, READY_FOR_PICKUP, PICKED_UP, IN_TRANSIT, DELIVERED, CANCELLED, REFUNDED]
 *         description: Filter orders by status (optional)
 *     responses:
 *       200:
 *         description: Orders retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     orders:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             example: order-uuid
 *                           orderId:
 *                             type: string
 *                             example: ORDER1234
 *                             description: Shortened order ID for display
 *                           price:
 *                             type: number
 *                             example: 5000
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                             example: 2024-01-15T10:30:00Z
 *                           customerName:
 *                             type: string
 *                             example: John Doe
 *                           customerPhone:
 *                             type: string
 *                             example: +250788123456
 *                           customerAddress:
 *                             type: string
 *                             example: 123 Main Street, Kigali, Rwanda
 *                           status:
 *                             type: string
 *                             example: PENDING
 *                             enum: [PENDING, CONFIRMED, PREPARING, READY_FOR_PICKUP, PICKED_UP, IN_TRANSIT, DELIVERED, CANCELLED, REFUNDED]
 *                           items:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 id:
 *                                   type: string
 *                                 productName:
 *                                   type: string
 *                                   example: Pizza Margherita
 *                                 quantity:
 *                                   type: number
 *                                   example: 2
 *                                 price:
 *                                   type: number
 *                                   example: 2500
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not a merchant
 *       404:
 *         description: Merchant profile not found
 */
router.get('/orders', getOrders);

/**
 * @swagger
 * /merchants/orders/{id}:
 *   get:
 *     summary: Get order details
 *     description: Retrieve detailed information about a specific order including customer details, items, and payment information
 *     tags: [Merchants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     order:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: order-uuid
 *                         orderId:
 *                           type: string
 *                           example: ORDER1234
 *                           description: Shortened order ID for display
 *                         customerName:
 *                           type: string
 *                           example: John Doe
 *                         customerPhone:
 *                           type: string
 *                           example: +250788123456
 *                         customerAddress:
 *                           type: string
 *                           example: 123 Main Street, Kigali, Rwanda
 *                         status:
 *                           type: string
 *                           example: PENDING
 *                           enum: [PENDING, CONFIRMED, PREPARING, READY_FOR_PICKUP, PICKED_UP, IN_TRANSIT, DELIVERED, CANCELLED, REFUNDED]
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                           example: 2024-01-15T10:30:00Z
 *                         items:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                               productName:
 *                                 type: string
 *                                 example: Pizza Margherita
 *                               quantity:
 *                                 type: number
 *                                 example: 2
 *                               price:
 *                                 type: number
 *                                 example: 2500
 *                         paymentMethod:
 *                           type: string
 *                           example: MOMO_PAY
 *                           enum: [CARD, CASH, MOMO_PAY]
 *                         paymentStatus:
 *                           type: string
 *                           example: PAID
 *                           enum: [PENDING, PAID, FAILED, REFUNDED, PARTIALLY_REFUNDED]
 *                         total:
 *                           type: number
 *                           example: 5000
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not a merchant
 *       404:
 *         description: Order not found
 */
router.get('/orders/:id', getOrderDetails);

/**
 * @swagger
 * /merchants/orders/{id}/status:
 *   put:
 *     summary: Update order status
 *     description: Update the status of an order (e.g., PREPARING, READY_FOR_PICKUP, CANCELLED)
 *     tags: [Merchants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [PENDING, CONFIRMED, PREPARING, READY_FOR_PICKUP, PICKED_UP, IN_TRANSIT, DELIVERED, CANCELLED, REFUNDED]
 *                 example: PREPARING
 *                 description: New order status
 *     responses:
 *       200:
 *         description: Order status updated successfully
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
 *                   example: Order status updated to PREPARING
 *                 data:
 *                   type: object
 *                   properties:
 *                     order:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         orderId:
 *                           type: string
 *                           example: ORDER1234
 *                         status:
 *                           type: string
 *                           example: PREPARING
 *                         customerName:
 *                           type: string
 *                           example: John Doe
 *       400:
 *         description: Bad request - invalid status
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not a merchant
 *       404:
 *         description: Order not found
 */
router.put('/orders/:id/status', validateUpdateOrderStatus, updateOrderStatus);

export default router; 