import { Router } from 'express';
import { PaymentController } from '../controllers/payment.controller';
import { authenticate } from '../middlewares/auth.middleware';

/**
 * Payment Routes
 * 
 * Defines all payment-related API endpoints with proper authentication
 * 
 * @swagger
 * components:
 *   schemas:
 *     PaymentRequest:
 *       type: object
 *       required:
 *         - amount
 *         - currency
 *         - payerPhoneNumber
 *         - description
 *       properties:
 *         amount:
 *           type: number
 *           description: Payment amount
 *           example: 1000
 *         currency:
 *           type: string
 *           description: Currency code
 *           example: "RWF"
 *         phoneNumber:
 *           type: string
 *           description: Payer's phone number in international format
 *           example: "+256781234567"
 *         description:
 *           type: string
 *           description: Payment description
 *           example: "Payment for services"
 *         callbackUrl:
 *           type: string
 *           format: uri
 *           description: Optional callback URL for payment status updates
 *           example: "https://api.example.com/payments/callback"
 *         paymentMethod:
 *           type: string
 *           description: Payment method
 *           example: "MOMO_PAY"
 *         orderId:
 *           type: string
 *           description: Order ID
 *           example: "awec-312f-412f-412f-412f"
 *         userId:
 *           type: string
 *           description: User ID
 * 
 *     PaymentResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           description: Whether the payment request was successful
 *         transactionId:
 *           type: string
 *           description: Unique transaction identifier
 *           example: "550e8400-e29b-41d4-a716-446655440000"
 *         status:
 *           type: string
 *           enum: [PENDING, SUCCESSFUL, FAILED]
 *           description: Payment status
 *         message:
 *           type: string
 *           description: Human-readable message
 *         referenceId:
 *           type: string
 *           description: External reference ID
 * 
 *     PaymentVerification:
 *       type: object
 *       properties:
 *         transactionId:
 *           type: string
 *           description: Transaction identifier
 *         status:
 *           type: string
 *           enum: [PENDING, SUCCESSFUL, FAILED]
 *         amount:
 *           type: number
 *           description: Payment amount
 *         currency:
 *           type: string
 *           description: Currency code
 *         payerPhoneNumber:
 *           type: string
 *           description: Payer's phone number
 *         description:
 *           type: string
 *           description: Payment description
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Payment creation timestamp
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 * 
 *     PaymentHistory:
 *       type: object
 *       properties:
 *         payments:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/PaymentVerification'
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
 * 
 *     PaymentStats:
 *       type: object
 *       properties:
 *         totalTransactions:
 *           type: integer
 *           description: Total number of transactions
 *         successfulTransactions:
 *           type: integer
 *           description: Number of successful transactions
 *         failedTransactions:
 *           type: integer
 *           description: Number of failed transactions
 *         pendingTransactions:
 *           type: integer
 *           description: Number of pending transactions
 *         totalAmount:
 *           type: number
 *           description: Total amount processed
 *         successRate:
 *           type: number
 *           description: Success rate percentage
 * 
 *     PaymentMethod:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Payment method identifier
 *         name:
 *           type: string
 *           description: Payment method name
 *         provider:
 *           type: string
 *           description: Payment provider
 *         isActive:
 *           type: boolean
 *           description: Whether the method is active
 *         supportedCurrencies:
 *           type: array
 *           items:
 *             type: string
 *           description: Supported currencies
 * 
 *     WebhookPayload:
 *       type: object
 *       properties:
 *         referenceId:
 *           type: string
 *           description: Transaction reference ID
 *         status:
 *           type: string
 *           enum: [SUCCESSFUL, FAILED]
 *           description: Final transaction status
 *         amount:
 *           type: number
 *           description: Transaction amount
 *         currency:
 *           type: string
 *           description: Currency code
 *         reason:
 *           type: string
 *           description: Status reason (for failed transactions)
 * 
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         error:
 *           type: string
 *           description: Error message
 *         code:
 *           type: string
 *           description: Error code
 *         details:
 *           type: object
 *           description: Additional error details
 * 
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *       description: JWT token authentication
 * 
 * tags:
 *   - name: Payments
 *     description: Payment processing and management endpoints
 *   - name: Webhooks
 *     description: External webhook endpoints for payment status updates
 */

const router = Router();
const paymentController = new PaymentController();

/**
 * @swagger
 * /api/payments/webhook/momo:
 *   post:
 *     tags:
 *       - Webhooks
 *     summary: Handle MoMo payment webhook
 *     description: |
 *       Receives payment status updates from MTN MoMo API.
 *       This endpoint is called by MTN when a payment status changes.
 *       No authentication required as this is an external webhook.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/WebhookPayload'
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Webhook processed successfully"
 *       400:
 *         description: Invalid webhook payload
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// Public webhook endpoint (no auth required for MoMo callbacks)
router.post('/webhook/momo', paymentController.handleMoMoWebhook);

// Protected routes requiring authentication
router.use(authenticate);

/**
 * @swagger
 * /payments/process:
 *   post:
 *     tags:
 *       - Payments
 *     summary: Process a new payment
 *     description: |
 *       Initiates a new payment request through MTN MoMo API.
 *       The payment will be in PENDING status initially and updated via webhook.
 *       Requires authentication.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PaymentRequest'
 *     responses:
 *       201:
 *         description: Payment request created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentResponse'
 *       400:
 *         description: Invalid payment request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized - invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       422:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/process', paymentController.processPayment);

/**
 * @swagger
 * /payments/verify/{transactionId}:
 *   get:
 *     tags:
 *       - Payments
 *     summary: Verify payment status
 *     description: |
 *       Retrieves the current status of a payment transaction.
 *       Useful for checking payment status when webhook is not received.
 *       Requires authentication.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transactionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Unique transaction identifier
 *         example: "550e8400-e29b-41d4-a716-446655440000"
 *     responses:
 *       200:
 *         description: Payment status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentVerification'
 *       401:
 *         description: Unauthorized - invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Transaction not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// Payment verification
router.get('/verify/:transactionId', paymentController.verifyPayment);

/**
 * @swagger
 * /payments/history:
 *   get:
 *     tags:
 *       - Payments
 *     summary: Get payment history
 *     description: |
 *       Retrieves paginated payment history for the authenticated user.
 *       Supports filtering and sorting options.
 *       Requires authentication.
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *         description: Number of items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, SUCCESSFUL, FAILED]
 *         description: Filter by payment status
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for filtering (YYYY-MM-DD)
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for filtering (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Payment history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentHistory'
 *       401:
 *         description: Unauthorized - invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       400:
 *         description: Invalid query parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// Payment history and management
router.get('/history', paymentController.getPaymentHistory);

/**
 * @swagger
 * /payments/stats:
 *   get:
 *     tags:
 *       - Payments
 *     summary: Get payment statistics
 *     description: |
 *       Retrieves payment statistics and analytics for the authenticated user.
 *       Includes transaction counts, success rates, and total amounts.
 *       Requires authentication.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [daily, weekly, monthly, yearly]
 *           default: monthly
 *         description: Time period for statistics
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for statistics (YYYY-MM-DD)
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for statistics (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Payment statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentStats'
 *       401:
 *         description: Unauthorized - invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       400:
 *         description: Invalid query parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/stats', paymentController.getPaymentStats);

/**
 * @swagger
 * /payments/retry/{paymentId}:
 *   post:
 *     tags:
 *       - Payments
 *     summary: Retry a failed payment
 *     description: |
 *       Retries a previously failed payment transaction.
 *       Creates a new transaction with the same details as the original.
 *       Requires authentication.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID of the failed payment to retry
 *         example: "550e8400-e29b-41d4-a716-446655440000"
 *     responses:
 *       201:
 *         description: Payment retry initiated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentResponse'
 *       400:
 *         description: Payment cannot be retried (not failed or already retried)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized - invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Payment not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/retry/:paymentId', paymentController.retryPayment);

/**
 * @swagger
 * /payments/methods:
 *   get:
 *     tags:
 *       - Payments
 *     summary: Get available payment methods
 *     description: |
 *       Retrieves all available payment methods and their configurations.
 *       Shows which methods are active and their supported currencies.
 *       Requires authentication.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payment methods retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 methods:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/PaymentMethod'
 *       401:
 *         description: Unauthorized - invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// Payment methods and configuration
router.get('/methods', paymentController.getPaymentMethods);

/**
 * @swagger
 * /payments/test-providers:
 *   get:
 *     tags:
 *       - Payments
 *     summary: Test payment providers connectivity
 *     description: |
 *       Tests connectivity and health status of all configured payment providers.
 *       Useful for monitoring and debugging payment infrastructure.
 *       Requires authentication. Intended for admin/testing purposes.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Provider test results retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 providers:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                         description: Provider name
 *                       status:
 *                         type: string
 *                         enum: [healthy, unhealthy, error]
 *                         description: Provider health status
 *                       responseTime:
 *                         type: number
 *                         description: Response time in milliseconds
 *                       lastChecked:
 *                         type: string
 *                         format: date-time
 *                         description: Last health check timestamp
 *                       error:
 *                         type: string
 *                         description: Error message if unhealthy
 *       401:
 *         description: Unauthorized - invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// Admin/testing endpoints
router.get('/test-providers', paymentController.testProviders);

export default router;