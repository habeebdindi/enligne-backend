import { Router } from 'express';
import { 
  getRiderDashboard,
  toggleAvailability, 
  getAvailableOrders,
  acceptOrder,
  updateDeliveryStatus,
  getEarnings,
  getDeliveryHistory,
  getRiderProfile,
  updateRiderProfile,
  getCurrentDelivery
} from '../controllers/rider.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { 
  validateToggleAvailability, 
  validateUpdateDeliveryStatus, 
  validateUpdateRiderProfile 
} from '../validators/rider.validator';
import { Role } from '@prisma/client';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);
router.use(authorize(Role.RIDER));

/**
 * @swagger
 * tags:
 *   name: Riders
 *   description: Rider management and delivery operations
 */

/**
 * @swagger
 * /riders/dashboard:
 *   get:
 *     summary: Get rider dashboard data
 *     description: Get comprehensive dashboard data including profile, available orders, current delivery, and earnings
 *     tags: [Riders]
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
 *                     rider:
 *                       $ref: '#/components/schemas/RiderProfile'
 *                     availableOrders:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/AvailableOrder'
 *                     currentDelivery:
 *                       $ref: '#/components/schemas/CurrentDelivery'
 *                     earnings:
 *                       $ref: '#/components/schemas/EarningsData'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not a rider
 */
router.get('/dashboard', getRiderDashboard);

/**
 * @swagger
 * /riders/availability:
 *   patch:
 *     summary: Toggle rider availability
 *     description: Toggle rider online/offline status
 *     tags: [Riders]
 *     security:
 *       - bearerAuth: []
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
 *                 description: Rider availability status
 *                 example: true
 *               currentLocation:
 *                 type: object
 *                 properties:
 *                   lat:
 *                     type: number
 *                     example: -1.9441
 *                   lng:
 *                     type: number
 *                     example: 30.0619
 *     responses:
 *       200:
 *         description: Availability status updated successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not a rider
 */
router.patch('/availability', validateToggleAvailability, toggleAvailability);

/**
 * @swagger
 * /riders/orders/available:
 *   get:
 *     summary: Get available orders for pickup
 *     description: Get orders that are ready for pickup by riders
 *     tags: [Riders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 50
 *         description: Number of orders to return
 *     responses:
 *       200:
 *         description: Available orders retrieved successfully
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
 *                     $ref: '#/components/schemas/AvailableOrder'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not a rider
 */
router.get('/orders/available', getAvailableOrders);

/**
 * @swagger
 * /riders/orders/{orderId}/accept:
 *   post:
 *     summary: Accept an order for delivery
 *     description: Accept an order and assign it to the rider
 *     tags: [Riders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID to accept
 *     responses:
 *       200:
 *         description: Order accepted successfully
 *       400:
 *         description: Order not available or rider not available
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not a rider
 *       404:
 *         description: Order not found
 */
router.post('/orders/:orderId/accept', acceptOrder);

/**
 * @swagger
 * /riders/deliveries/{deliveryId}/status:
 *   patch:
 *     summary: Update delivery status
 *     description: Update the status of an assigned delivery
 *     tags: [Riders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: deliveryId
 *         required: true
 *         schema:
 *           type: string
 *         description: Delivery ID
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
 *                 enum: [PENDING, ASSIGNED, PICKED_UP, IN_TRANSIT, DELIVERED, FAILED, CANCELLED]
 *                 description: New delivery status
 *                 example: PICKED_UP
 *               location:
 *                 type: object
 *                 properties:
 *                   lat:
 *                     type: number
 *                     example: -1.9441
 *                   lng:
 *                     type: number
 *                     example: 30.0619
 *     responses:
 *       200:
 *         description: Delivery status updated successfully
 *       400:
 *         description: Invalid status or request data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not assigned to this delivery
 *       404:
 *         description: Delivery not found
 */
router.patch('/deliveries/:deliveryId/status', validateUpdateDeliveryStatus, updateDeliveryStatus);

/**
 * @swagger
 * /riders/deliveries/current:
 *   get:
 *     summary: Get current active delivery
 *     description: Get the rider's current active delivery
 *     tags: [Riders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current delivery retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/CurrentDelivery'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not a rider
 */
router.get('/deliveries/current', getCurrentDelivery);

/**
 * @swagger
 * /riders/earnings:
 *   get:
 *     summary: Get rider earnings
 *     description: Get earnings data for today, this week, and this month
 *     tags: [Riders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Earnings data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/EarningsData'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not a rider
 */
router.get('/earnings', getEarnings);

/**
 * @swagger
 * /riders/deliveries/history:
 *   get:
 *     summary: Get delivery history
 *     description: Get paginated delivery history for the rider
 *     tags: [Riders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *           minimum: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *         description: Number of deliveries per page
 *     responses:
 *       200:
 *         description: Delivery history retrieved successfully
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
 *                     deliveries:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/DeliveryHistory'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not a rider
 */
router.get('/deliveries/history', getDeliveryHistory);

/**
 * @swagger
 * /riders/profile:
 *   get:
 *     summary: Get rider profile
 *     description: Get rider profile with stats
 *     tags: [Riders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Rider profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/RiderProfile'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not a rider
 *       404:
 *         description: Rider profile not found
 */
router.get('/profile', getRiderProfile);

/**
 * @swagger
 * /riders/profile:
 *   patch:
 *     summary: Update rider profile
 *     description: Update rider profile information
 *     tags: [Riders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               vehicleType:
 *                 type: string
 *                 description: Type of vehicle
 *                 example: Motorcycle
 *               vehicleNumber:
 *                 type: string
 *                 description: Vehicle registration number
 *                 example: RW123ABC
 *               identityDoc:
 *                 type: string
 *                 description: Identity document information
 *                 example: ID123456789
 *               currentLocation:
 *                 type: object
 *                 properties:
 *                   lat:
 *                     type: number
 *                     example: -1.9441
 *                   lng:
 *                     type: number
 *                     example: 30.0619
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not a rider
 *       404:
 *         description: Rider profile not found
 */
router.patch('/profile', validateUpdateRiderProfile, updateRiderProfile);

export default router; 