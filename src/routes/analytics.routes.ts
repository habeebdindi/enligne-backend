import { Router } from 'express';
import { getAnalytics } from '../controllers/analytics.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validateAnalyticsFilter } from '../validators/analytics.validator';
import { Role } from '@prisma/client';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

/**
 * @swagger
 * /merchants/analytics:
 *   get:
 *     summary: Get merchant analytics data
 *     description: Retrieve comprehensive analytics data including key metrics, revenue trends, performance metrics, top selling items, and customer insights
 *     tags: [Merchants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: filter
 *         schema:
 *           type: string
 *           enum: [today, 7days, 30days, 3months]
 *           default: 7days
 *         description: Time filter for analytics data
 *     responses:
 *       200:
 *         description: Analytics data retrieved successfully
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
 *                     keyMetrics:
 *                       type: object
 *                       properties:
 *                         revenue:
 *                           type: object
 *                           properties:
 *                             amount:
 *                               type: number
 *                               example: 255000
 *                               description: Total revenue in the selected period
 *                             growth:
 *                               type: number
 *                               example: 12.5
 *                               description: Growth percentage compared to previous period
 *                         orders:
 *                           type: object
 *                           properties:
 *                             count:
 *                               type: number
 *                               example: 45
 *                               description: Total number of orders in the selected period
 *                             growth:
 *                               type: number
 *                               example: 8.2
 *                               description: Growth percentage compared to previous period
 *                         customers:
 *                           type: object
 *                           properties:
 *                             count:
 *                               type: number
 *                               example: 28
 *                               description: Total number of unique customers in the selected period
 *                             growth:
 *                               type: number
 *                               example: -3.1
 *                               description: Growth percentage compared to previous period
 *                         averageOrderValue:
 *                           type: object
 *                           properties:
 *                             amount:
 *                               type: number
 *                               example: 5666.67
 *                               description: Average order value in the selected period
 *                             growth:
 *                               type: number
 *                               example: 4.2
 *                               description: Growth percentage compared to previous period
 *                     revenueTrend:
 *                       type: array
 *                       description: Revenue trend data points based on the selected filter
 *                       items:
 *                         type: object
 *                         properties:
 *                           date:
 *                             type: string
 *                             example: "14:00"
 *                             description: Date/time label (format varies by filter)
 *                           revenue:
 *                             type: number
 *                             example: 25000
 *                             description: Revenue for this time period
 *                           orders:
 *                             type: number
 *                             example: 5
 *                             description: Number of orders for this time period
 *                     performanceMetrics:
 *                       type: object
 *                       description: Performance metrics not based on time filters
 *                       properties:
 *                         customerRetention:
 *                           type: number
 *                           example: 68.5
 *                           description: Customer retention percentage (last 30 days vs previous 30 days)
 *                         averagePreparationTime:
 *                           type: number
 *                           example: 25
 *                           description: Average preparation time in minutes
 *                         customerRating:
 *                           type: number
 *                           example: 4.8
 *                           description: Average customer rating out of 5
 *                         orderCompletionRate:
 *                           type: number
 *                           example: 97.2
 *                           description: Order completion rate percentage
 *                     topSellingItems:
 *                       type: array
 *                       description: Top 10 selling items by revenue
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             example: "product-uuid"
 *                           name:
 *                             type: string
 *                             example: "Pizza Margherita"
 *                           image:
 *                             type: string
 *                             example: "https://example.com/pizza.jpg"
 *                           totalOrders:
 *                             type: number
 *                             example: 15
 *                             description: Total number of orders for this item
 *                           totalSales:
 *                             type: number
 *                             example: 75000
 *                             description: Total sales amount for this item
 *                     customerInsights:
 *                       type: object
 *                       description: Customer behavior insights
 *                       properties:
 *                         peakOrderHours:
 *                             type: string
 *                             example: "18:00"
 *                             description: Peak order hour in 24-hour format
 *                         mostPopularOrderDay:
 *                             type: string
 *                             example: "Friday"
 *                             description: Day of the week with most orders
 *                         repeatCustomersPercentage:
 *                             type: number
 *                             example: 68.0
 *                             description: Percentage of customers who placed multiple orders
 *                         deliverySuccessRate:
 *                             type: number
 *                             example: 97.0
 *                             description: Percentage of successful deliveries
 *       400:
 *         description: Invalid filter parameter
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: error
 *                 message:
 *                   type: string
 *                   example: "Invalid filter. Must be one of: today, 7days, 30days, 3months"
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not a merchant
 *       404:
 *         description: Merchant profile not found
 */
router.get('/', authorize(Role.MERCHANT), validateAnalyticsFilter, getAnalytics);

export default router; 