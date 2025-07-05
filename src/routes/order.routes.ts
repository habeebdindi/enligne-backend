import { Router } from 'express';
import { OrderController } from '../controllers/order.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();
router.use(authenticate);

const orderController = new OrderController();

/**
 * @swagger
 * /orders:
 *   post:
 *     summary: Create a new order from cart
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - addressId
 *               - paymentMethod
 *             properties:
 *               addressId:
 *                 type: string
 *                 format: uuid
 *                 description: ID of the delivery address
 *               paymentMethod:
 *                 type: string
 *                 enum: [CARD, CASH, MOMO_PAY]
 *                 description: Payment method for the order
 *               notes:
 *                 type: string
 *                 description: Special instructions for the order
 *               scheduledFor:
 *                 type: string
 *                 format: date-time
 *                 description: Schedule order for specific time (optional)
 *               deliveryFee:
 *                 type: number
 *                 description: Delivery fee for the order (optional)
 *     responses:
 *       201:
 *         description: Order created successfully
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
 *                   example: Order created successfully
 *                 data:
 *                   oneOf:
 *                     - type: object
 *                       properties:
 *                         order:
 *                           $ref: '#/components/schemas/Order'
 *                       description: Single order (items from one merchant)
 *                     - type: object
 *                       properties:
 *                         orders:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Order'
 *                         summary:
 *                           type: object
 *                           properties:
 *                             totalOrders:
 *                               type: integer
 *                               example: 2
 *                             totalAmount:
 *                               type: number
 *                               example: 45000
 *                             merchants:
 *                               type: array
 *                               items:
 *                                 type: string
 *                               example: ["Pharmacy Plus", "Fresh Market"]
 *                         description: Multiple orders (items from different merchants)
 *       400:
 *         description: Bad request (cart empty, missing fields, etc.)
 *       401:
 *         description: Unauthorized
 *   get:
 *     summary: Get all orders for the authenticated user
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           maximum: 50
 *         description: Number of orders per page
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
 *                         $ref: '#/components/schemas/Order'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *       401:
 *         description: Unauthorized
 */
router.post('/', orderController.createOrder);
router.get('/', orderController.getOrders);

/**
 * @swagger
 * /orders/platform-fee/tiers:
 *   get:
 *     summary: Get platform fee tiers
 *     description: Get all platform fee tiers based on order value
 *     tags: [Orders]
 *     responses:
 *       200:
 *         description: Platform fee tiers retrieved successfully
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
 *                     tiers:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           minAmount:
 *                             type: number
 *                             example: 0
 *                           maxAmount:
 *                             type: number
 *                             example: 1500
 *                           fee:
 *                             type: number
 *                             example: 50
 *                           description:
 *                             type: string
 *                             example: "Order between 0 and 1,500 RWF: 50 RWF"
 *                     description:
 *                       type: string
 *                       example: "Platform fee is calculated based on order subtotal using these tiers"
 */
router.get('/platform-fee/tiers', orderController.getPlatformFeeTiers);

/**
 * @swagger
 * /orders/platform-fee/calculate:
 *   get:
 *     summary: Calculate platform fee for amount
 *     description: Calculate platform fee for a specific order amount
 *     tags: [Orders]
 *     parameters:
 *       - in: query
 *         name: amount
 *         required: true
 *         schema:
 *           type: number
 *         description: Order subtotal amount in RWF
 *         example: 5000
 *     responses:
 *       200:
 *         description: Platform fee calculated successfully
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
 *                     subtotal:
 *                       type: number
 *                       example: 5000
 *                     platformFee:
 *                       type: number
 *                       example: 150
 *                     description:
 *                       type: string
 *                       example: "Platform fee for 5,000 RWF is 150 RWF"
 *       400:
 *         description: Invalid amount parameter
 */
router.get('/platform-fee/calculate', orderController.calculatePlatformFeeForAmount);

/**
 * @swagger
 * /orders/{id}:
 *   get:
 *     summary: Get order by ID
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order retrieved successfully
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
 *                       $ref: '#/components/schemas/Order'
 *       404:
 *         description: Order not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:id', orderController.getOrderById);

export default router;