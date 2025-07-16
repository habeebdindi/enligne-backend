import { Router } from 'express';
import { DisbursementController } from '../controllers/disbursement.controller';
import { authenticate } from '../middlewares/auth.middleware';

/**
 * Disbursement Routes
 * 
 * All routes require admin authentication for security
 * 
 * @swagger
 * components:
 *   schemas:
 *     DisbursementRequest:
 *       type: object
 *       required:
 *         - type
 *         - amount
 *         - phoneNumber
 *         - recipientName
 *         - description
 *       properties:
 *         type:
 *           type: string
 *           enum: [MERCHANT_PAYOUT, CUSTOMER_REFUND, ADMIN_PAYOUT, COMMISSION_PAYOUT, BONUS_PAYOUT]
 *           description: Type of disbursement
 *           example: "MERCHANT_PAYOUT"
 *         amount:
 *           type: number
 *           minimum: 100
 *           maximum: 10000000
 *           description: Amount to disburse in RWF
 *           example: 50000
 *         currency:
 *           type: string
 *           default: "RWF"
 *           description: Currency code
 *           example: "RWF"
 *         phoneNumber:
 *           type: string
 *           description: Recipient's phone number
 *           example: "+250781234567"
 *         recipientName:
 *           type: string
 *           description: Full name of the recipient
 *           example: "John Doe"
 *         reference:
 *           type: string
 *           description: Optional custom reference
 *           example: "MP-20250101-ABC123"
 *         description:
 *           type: string
 *           description: Purpose of the disbursement
 *           example: "Monthly merchant payout for January 2025"
 *         metadata:
 *           type: object
 *           description: Additional metadata
 *         scheduledFor:
 *           type: string
 *           format: date-time
 *           description: When to process the disbursement
 *         requiresApproval:
 *           type: boolean
 *           description: Whether approval is required
 *           example: false
 * 
 *     DisbursementResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           description: Whether the operation was successful
 *         disbursementId:
 *           type: string
 *           format: uuid
 *           description: Unique disbursement identifier
 *         transactionId:
 *           type: string
 *           description: External provider transaction ID
 *         reference:
 *           type: string
 *           description: Disbursement reference
 *         status:
 *           type: string
 *           enum: [PENDING, APPROVED, PROCESSING, SUCCESSFUL, FAILED, CANCELLED, REJECTED]
 *           description: Current disbursement status
 *         message:
 *           type: string
 *           description: Status message
 *         estimatedCompletionTime:
 *           type: string
 *           format: date-time
 *           description: Estimated completion time
 *         metadata:
 *           type: object
 *           description: Additional response metadata
 * 
 *     DisbursementDetails:
 *       type: object
 *       properties:
 *         isValid:
 *           type: boolean
 *           description: Whether the disbursement is valid
 *         status:
 *           type: string
 *           enum: [PENDING, APPROVED, PROCESSING, SUCCESSFUL, FAILED, CANCELLED, REJECTED]
 *         amount:
 *           type: number
 *           description: Disbursement amount
 *         currency:
 *           type: string
 *           description: Currency code
 *         disbursementId:
 *           type: string
 *           description: Disbursement ID
 *         transactionId:
 *           type: string
 *           description: External transaction ID
 *         reference:
 *           type: string
 *           description: Disbursement reference
 *         recipientPhone:
 *           type: string
 *           description: Recipient's phone number
 *         completedAt:
 *           type: string
 *           format: date-time
 *           description: Completion timestamp
 *         failureReason:
 *           type: string
 *           description: Reason for failure if applicable
 * 
 *     BulkDisbursementRequest:
 *       type: object
 *       required:
 *         - disbursements
 *         - description
 *       properties:
 *         disbursements:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/DisbursementRequest'
 *           description: Array of disbursements to create
 *         description:
 *           type: string
 *           description: Description for the bulk operation
 *           example: "Monthly payouts for January 2025"
 *         scheduledFor:
 *           type: string
 *           format: date-time
 *           description: When to process all disbursements
 *         requiresApproval:
 *           type: boolean
 *           description: Whether approval is required for all
 *         metadata:
 *           type: object
 *           description: Additional bulk operation metadata
 * 
 *     BulkDisbursementResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           description: Whether the bulk operation was successful
 *         batchId:
 *           type: string
 *           format: uuid
 *           description: Unique batch identifier
 *         totalDisbursements:
 *           type: integer
 *           description: Total number of disbursements
 *         successfulDisbursements:
 *           type: integer
 *           description: Number of successful disbursements
 *         failedDisbursements:
 *           type: integer
 *           description: Number of failed disbursements
 *         disbursements:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/DisbursementResponse'
 *           description: Individual disbursement results
 * 
 *     DisbursementApprovalRequest:
 *       type: object
 *       required:
 *         - disbursementIds
 *         - action
 *       properties:
 *         disbursementIds:
 *           type: array
 *           items:
 *             type: string
 *             format: uuid
 *           description: Array of disbursement IDs to approve/reject
 *         action:
 *           type: string
 *           enum: [APPROVE, REJECT]
 *           description: Action to take
 *         approvalNote:
 *           type: string
 *           description: Optional note for the approval/rejection
 * 
 *     DisbursementStats:
 *       type: object
 *       properties:
 *         totalDisbursements:
 *           type: integer
 *           description: Total number of disbursements
 *         totalAmount:
 *           type: number
 *           description: Total amount disbursed
 *         successfulDisbursements:
 *           type: integer
 *           description: Number of successful disbursements
 *         failedDisbursements:
 *           type: integer
 *           description: Number of failed disbursements
 *         pendingDisbursements:
 *           type: integer
 *           description: Number of pending disbursements
 *         successRate:
 *           type: number
 *           description: Success rate percentage
 *         averageAmount:
 *           type: number
 *           description: Average disbursement amount
 *         totalFees:
 *           type: number
 *           description: Total fees charged
 *         byType:
 *           type: object
 *           description: Statistics grouped by disbursement type
 *         byStatus:
 *           type: object
 *           description: Statistics grouped by status
 * 
 *     DisbursementType:
 *       type: object
 *       properties:
 *         type:
 *           type: string
 *           description: Disbursement type code
 *         name:
 *           type: string
 *           description: Human-readable name
 *         description:
 *           type: string
 *           description: Description of the disbursement type
 *         requiresApproval:
 *           type: boolean
 *           description: Whether this type requires approval by default
 * 
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           example: "error"
 *         message:
 *           type: string
 *           description: Error message
 *         code:
 *           type: string
 *           description: Error code
 * 
 * tags:
 *   - name: Admin - Disbursements
 *     description: Administrative disbursement management endpoints for processing payouts, refunds, and other outgoing payments
 */

const router = Router();
const disbursementController = new DisbursementController();

// Apply authentication to all routes
router.use(authenticate);

/**
 * @swagger
 * /disbursements:
 *   post:
 *     tags:
 *       - Admin - Disbursements
 *     summary: Create a new disbursement
 *     description: |
 *       Creates a new disbursement for sending money to recipients.
 *       Supports various disbursement types including merchant payouts,and customer refunds.
 *       Requires admin authentication.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DisbursementRequest'
 *           examples:
 *             merchantPayout:
 *               summary: Merchant Payout
 *               value:
 *                 type: "MERCHANT_PAYOUT"
 *                 amount: 150000
 *                 phoneNumber: "+250781234567"
 *                 recipientName: "Alice's Restaurant"
 *                 description: "Monthly payout for December 2024"
 *                 metadata:
 *                   merchantId: "merchant_123"
 *                   period: "2024-12"
 *             customerRefund:
 *               summary: Customer Refund
 *               value:
 *                 type: "CUSTOMER_REFUND"
 *                 amount: 25000
 *                 phoneNumber: "+250782345678"
 *                 recipientName: "John Doe"
 *                 description: "Refund for cancelled order #ORD-123"
 *                 requiresApproval: true
 *                 metadata:
 *                   orderId: "order_123"
 *                   reason: "cancelled_by_customer"
 *     responses:
 *       201:
 *         description: Disbursement created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 message:
 *                   type: string
 *                   example: "Disbursement created successfully"
 *                 data:
 *                   $ref: '#/components/schemas/DisbursementResponse'
 *       400:
 *         description: Invalid request data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized - admin access required
 *       500:
 *         description: Internal server error
 *
 *   get:
 *     tags:
 *       - Admin - Disbursements
 *     summary: Get disbursements with filtering and pagination
 *     description: |
 *       Retrieves a paginated list of disbursements with optional filtering.
 *       Supports filtering by type, status, date range, amount range, and recipient.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: type
 *         in: query
 *         schema:
 *           type: string
 *           enum: [MERCHANT_PAYOUT, CUSTOMER_REFUND, ADMIN_PAYOUT, COMMISSION_PAYOUT, BONUS_PAYOUT]
 *         description: Filter by disbursement type
 *       - name: status
 *         in: query
 *         schema:
 *           type: string
 *           enum: [PENDING, APPROVED, PROCESSING, SUCCESSFUL, FAILED, CANCELLED, REJECTED]
 *         description: Filter by status
 *       - name: recipientPhone
 *         in: query
 *         schema:
 *           type: string
 *         description: Filter by recipient phone number (partial match)
 *       - name: startDate
 *         in: query
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for filtering (YYYY-MM-DD)
 *       - name: endDate
 *         in: query
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for filtering (YYYY-MM-DD)
 *       - name: minAmount
 *         in: query
 *         schema:
 *           type: number
 *         description: Minimum amount filter
 *       - name: maxAmount
 *         in: query
 *         schema:
 *           type: number
 *         description: Maximum amount filter
 *       - name: page
 *         in: query
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Items per page
 *       - name: sortBy
 *         in: query
 *         schema:
 *           type: string
 *           enum: [createdAt, amount, status]
 *           default: createdAt
 *         description: Sort field
 *       - name: sortOrder
 *         in: query
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Disbursements retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 data:
 *                   type: object
 *                   properties:
 *                     disbursements:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           type:
 *                             type: string
 *                           amount:
 *                             type: number
 *                           currency:
 *                             type: string
 *                           phoneNumber:
 *                             type: string
 *                           recipientName:
 *                             type: string
 *                           reference:
 *                             type: string
 *                           description:
 *                             type: string
 *                           status:
 *                             type: string
 *                           createdAt:
 *                             type: string
 *                             format: date-time
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
 *         description: Unauthorized - admin access required
 *       500:
 *         description: Internal server error
 */
router.post('/', disbursementController.createDisbursement);
router.get('/', disbursementController.getDisbursements);

/**
 * @swagger
 * /disbursements/bulk:
 *   post:
 *     tags:
 *       - Admin - Disbursements
 *     summary: Create bulk disbursements
 *     description: |
 *       Creates multiple disbursements in a single batch operation.
 *       Useful for processing monthly payouts or bulk refunds.
 *       All disbursements in the batch will share the same scheduling and approval settings.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BulkDisbursementRequest'
 *           example:
 *             disbursements:
 *               - type: "MERCHANT_PAYOUT"
 *                 amount: 75000
 *                 phoneNumber: "+250781111111"
 *                 recipientName: "Food Corner Restaurant"
 *                 description: "Weekly merchant payout"
 *               - type: "MERCHANT_PAYOUT"
 *                 amount: 85000
 *                 phoneNumber: "+250782222222"
 *                 recipientName: "Quick Bite Cafe"
 *                 description: "Weekly merchant payout"
 *             description: "Weekly merchant payouts for week ending Jan 15, 2025"
 *             requiresApproval: false
 *     responses:
 *       201:
 *         description: Bulk disbursements created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 message:
 *                   type: string
 *                   example: "Bulk disbursements created successfully"
 *                 data:
 *                   $ref: '#/components/schemas/BulkDisbursementResponse'
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized - admin access required
 *       500:
 *         description: Internal server error
 */
router.post('/bulk', disbursementController.createBulkDisbursements);

/**
 * @swagger
 * /disbursements/approve:
 *   post:
 *     tags:
 *       - Admin - Disbursements
 *     summary: Approve or reject disbursements
 *     description: |
 *       Processes approval or rejection for one or more disbursements.
 *       Only PENDING disbursements can be approved or rejected.
 *       Approved disbursements will be automatically processed for payment.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DisbursementApprovalRequest'
 *           examples:
 *             approve:
 *               summary: Approve disbursements
 *               value:
 *                 disbursementIds: ["disbursement_1", "disbursement_2"]
 *                 action: "APPROVE"
 *                 approvalNote: "All documentation verified and approved"
 *             reject:
 *               summary: Reject disbursements
 *               value:
 *                 disbursementIds: ["disbursement_3"]
 *                 action: "REJECT"
 *                 approvalNote: "Insufficient documentation provided"
 *     responses:
 *       200:
 *         description: Disbursements processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 message:
 *                   type: string
 *                   example: "Disbursements approved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 *                     processedCount:
 *                       type: integer
 *                     approvedCount:
 *                       type: integer
 *                     rejectedCount:
 *                       type: integer
 *                     results:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           disbursementId:
 *                             type: string
 *                           status:
 *                             type: string
 *                           message:
 *                             type: string
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized - admin access required
 *       500:
 *         description: Internal server error
 */
router.post('/approve', disbursementController.processDisbursementApprovals);

/**
 * @swagger
 * /disbursements/stats:
 *   get:
 *     tags:
 *       - Admin - Disbursements
 *     summary: Get disbursement statistics
 *     description: |
 *       Retrieves comprehensive disbursement statistics and analytics.
 *       Includes totals, success rates, and breakdowns by type and status.
 *       Optional date filtering for specific periods.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: startDate
 *         in: query
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for statistics (YYYY-MM-DD)
 *       - name: endDate
 *         in: query
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for statistics (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 data:
 *                   $ref: '#/components/schemas/DisbursementStats'
 *       401:
 *         description: Unauthorized - admin access required
 *       500:
 *         description: Internal server error
 */
router.get('/stats', disbursementController.getDisbursementStats);

/**
 * @swagger
 * /disbursements/types:
 *   get:
 *     tags:
 *       - Admin - Disbursements
 *     summary: Get available disbursement types
 *     description: |
 *       Retrieves all available disbursement types with their descriptions and default settings.
 *       Useful for building UI forms and understanding available options.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Disbursement types retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/DisbursementType'
 *       401:
 *         description: Unauthorized - admin access required
 *       500:
 *         description: Internal server error
 */
router.get('/types', disbursementController.getDisbursementTypes);

/**
 * @swagger
 * /disbursements/merchant-payouts:
 *   get:
 *     tags:
 *       - Admin - Disbursements
 *     summary: Get merchant payout summaries
 *     description: |
 *       Retrieves payout summaries for all merchants including pending amounts,
 *       total sales, platform fees, and net amounts due.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Merchant payout summaries retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       merchantId:
 *                         type: string
 *                       merchantName:
 *                         type: string
 *                       totalOrders:
 *                         type: integer
 *                       totalSales:
 *                         type: number
 *                       platformFee:
 *                         type: number
 *                       netAmount:
 *                         type: number
 *                       lastPayoutDate:
 *                         type: string
 *                         format: date-time
 *                       pendingAmount:
 *                         type: number
 *       401:
 *         description: Unauthorized - admin access required
 *       500:
 *         description: Internal server error
 */
router.get('/merchant-payouts', disbursementController.getMerchantPayoutSummaries);

/**
 * @swagger
 * /disbursements/{id}:
 *   get:
 *     tags:
 *       - Admin - Disbursements
 *     summary: Get disbursement by ID
 *     description: |
 *       Retrieves detailed information about a specific disbursement including
 *       current status, recipient details, and processing history.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Disbursement ID
 *     responses:
 *       200:
 *         description: Disbursement retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 data:
 *                   $ref: '#/components/schemas/DisbursementDetails'
 *       404:
 *         description: Disbursement not found
 *       401:
 *         description: Unauthorized - admin access required
 *       500:
 *         description: Internal server error
 */
router.get('/:id', disbursementController.getDisbursementById);

/**
 * @swagger
 * /disbursements/{id}/verify:
 *   get:
 *     tags:
 *       - Admin - Disbursements
 *     summary: Verify disbursement status
 *     description: |
 *       Verifies the current status of a disbursement by checking with the payment provider.
 *       This endpoint will refresh the status from the external provider if available.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Disbursement ID
 *     responses:
 *       200:
 *         description: Disbursement status verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 data:
 *                   $ref: '#/components/schemas/DisbursementDetails'
 *       404:
 *         description: Disbursement not found
 *       401:
 *         description: Unauthorized - admin access required
 *       500:
 *         description: Internal server error
 */
router.get('/:id/verify', disbursementController.verifyDisbursement);

/**
 * @swagger
 * /disbursements/{id}/retry:
 *   post:
 *     tags:
 *       - Admin - Disbursements
 *     summary: Retry a failed disbursement
 *     description: |
 *       Retries a disbursement that previously failed.
 *       Only disbursements with FAILED status can be retried.
 *       The disbursement will be reprocessed with the same parameters.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Disbursement ID
 *     responses:
 *       200:
 *         description: Disbursement retry initiated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 message:
 *                   type: string
 *                   example: "Disbursement retry initiated"
 *                 data:
 *                   $ref: '#/components/schemas/DisbursementDetails'
 *       400:
 *         description: Disbursement cannot be retried
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Disbursement not found
 *       401:
 *         description: Unauthorized - admin access required
 *       500:
 *         description: Internal server error
 */
router.post('/:id/retry', disbursementController.retryDisbursement);

export default router; 