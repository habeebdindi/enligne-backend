import { Request, Response } from 'express';
import { PaymentService } from '../services/payment.service';
import { DisbursementService } from '../services/disbursement.service';
import { PaymentStatus, DisbursementStatus } from '../types/payment.types';

/**
 * Payment Controller
 * 
 * Handles all payment-related HTTP endpoints:
 * - Process order payments
 * - Handle payment webhooks
 * - Payment verification and status checks
 * - Payment history and statistics
 */

export class PaymentController {
  private paymentService: PaymentService;
  private disbursementService: DisbursementService;

  constructor() {
    this.paymentService = new PaymentService();
    this.disbursementService = new DisbursementService();
  }

  /**
   * Process payment for an order
   * POST /api/payments/process
   */
  processPayment = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const { orderId, phoneNumber, paymentMethod } = req.body;

      if (!userId) {
        return res.status(401).json({
          status: 'error',
          message: 'User not authenticated'
        });
      }

      if (!orderId || !paymentMethod) {
        return res.status(400).json({
          status: 'error',
          message: 'Order ID and payment method are required'
        });
      }

      if (paymentMethod === 'MOMO_PAY' && !phoneNumber) {
        return res.status(400).json({
          status: 'error',
          message: 'Phone number is required for MoMo payments'
        });
      }

      const result = await this.paymentService.processOrderPayment(
        orderId,
        phoneNumber,
        paymentMethod
      );

      res.json({
        status: 'success',
        message: 'Payment processed successfully',
        data: result
      });

    } catch (error) {
      console.error('Payment processing error:', error);
      res.status(500).json({
        status: 'error',
        message: error instanceof Error ? error.message : 'Payment processing failed',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  };

  /**
   * Handle MoMo payment webhook
   * POST /api/payments/webhook/momo
   */
  handleMoMoWebhook = async (req: Request, res: Response) => {
    try {
      console.log('Received MoMo webhook:', req.body);

      const { referenceId, status, financialTransactionId, reason } = req.body;

      if (!referenceId) {
        return res.status(400).json({
          status: 'error',
          message: 'Reference ID is required'
        });
      }

      // Map MoMo status to our internal status
      let paymentStatus: PaymentStatus;
      switch (status) {
        case 'SUCCESSFUL':
          paymentStatus = PaymentStatus.SUCCESSFUL;
          break;
        case 'FAILED':
          paymentStatus = PaymentStatus.FAILED;
          break;
        default:
          paymentStatus = PaymentStatus.PENDING;
      }

      await this.paymentService.handlePaymentWebhook(
        referenceId,
        paymentStatus,
        {
          financialTransactionId,
          reason,
          webhookReceivedAt: new Date().toISOString()
        }
      );

      res.status(200).json({
        status: 'success',
        message: 'Webhook processed successfully'
      });

    } catch (error) {
      console.error('Webhook processing error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Webhook processing failed'
      });
    }
  };

  /**
   * Handle Paypack payment webhook
   * POST /api/payments/webhook/paypack
   */
  handlePaypackWebhook = async (req: Request, res: Response) => {
    try {
      console.log('🔔 Received Paypack webhook:', JSON.stringify(req.body, null, 2));

      // Paypack sends nested webhook structure
      const webhookData = req.body;
      
      // Extract transaction data from the nested structure
      const transactionData = webhookData.data || webhookData;
      const { ref, status, kind, client: phone, amount, currency, fee, created_at, processed_at } = transactionData;

      if (!ref) {
        console.error('❌ Missing ref in Paypack webhook:', webhookData);
        return res.status(400).json({
          status: 'error',
          message: 'Reference ID is required'
        });
      }

      console.log(`📋 Processing Paypack webhook for ref: ${ref}, status: ${status}, kind: ${kind}`);

      // Handle CASHIN transactions (payments)
      if (kind === 'CASHIN') {
        console.log(`💰 Processing CASHIN transaction for payment: ${ref}`);
        
        // Map Paypack status to our internal payment status
        let paymentStatus: PaymentStatus;
        switch (status?.toLowerCase()) {
          case 'successful':
          case 'success':
          case 'completed':
            paymentStatus = PaymentStatus.SUCCESSFUL;
            break;
          case 'failed':
          case 'failure':
          case 'error':
            paymentStatus = PaymentStatus.FAILED;
            break;
          default:
            paymentStatus = PaymentStatus.PENDING;
        }

        console.log(`🔄 Mapped Paypack status "${status}" to payment status "${paymentStatus}"`);

        await this.paymentService.handlePaymentWebhook(
          ref,
          paymentStatus,
          {
            paypackRef: ref,
            kind,
            phone,
            amount,
            currency,
            fee,
            created_at,
            processed_at,
            webhookEventId: webhookData.event_id,
            webhookKind: webhookData.kind,
            webhookReceivedAt: new Date().toISOString()
          }
        );

        console.log(`✅ Successfully processed CASHIN webhook for ref: ${ref}`);
      }
      // Handle CASHOUT transactions (disbursements)
      else if (kind === 'CASHOUT') {
        console.log(`💸 Processing CASHOUT transaction for disbursement: ${ref}`);
        
        // Map Paypack status to our internal disbursement status
        let disbursementStatus: DisbursementStatus;
        switch (status?.toLowerCase()) {
          case 'successful':
          case 'success':
          case 'completed':
            disbursementStatus = DisbursementStatus.SUCCESSFUL;
            break;
          case 'failed':
          case 'failure':
          case 'error':
            disbursementStatus = DisbursementStatus.FAILED;
            break;
          case 'pending':
          case 'processing':
            disbursementStatus = DisbursementStatus.PROCESSING;
            break;
          default:
            disbursementStatus = DisbursementStatus.PROCESSING;
        }

        console.log(`🔄 Mapped Paypack status "${status}" to disbursement status "${disbursementStatus}"`);

        // Update disbursement status using Paypack reference
        await this.disbursementService.handleDisbursementWebhook(
          ref,
          disbursementStatus,
          {
            paypackRef: ref,
            kind,
            phone,
            amount,
            currency,
            fee,
            created_at,
            processed_at,
            webhookEventId: webhookData.event_id,
            webhookKind: webhookData.kind,
            webhookReceivedAt: new Date().toISOString()
          }
        );

        console.log(`✅ Successfully processed CASHOUT webhook for ref: ${ref}`);
      }
      else {
        console.log(`⏭️  Skipping ${kind} transaction - unknown transaction type`);
        return res.status(200).json({
          status: 'success',
          message: 'Webhook acknowledged - unknown transaction type'
        });
      }

      res.status(200).json({
        status: 'success',
        message: 'Webhook processed successfully'
      });

    } catch (error) {
      console.error('💥 Paypack webhook processing error:', error);
      
      // Still return 200 to prevent Paypack from retrying
      // Log the error but acknowledge receipt
      res.status(200).json({
        status: 'error', 
        message: 'Webhook processing failed but acknowledged'
      });
    }
  };

  /**
   * Verify payment status
   * GET /api/payments/verify/:transactionId
   */
  verifyPayment = async (req: Request, res: Response) => {
    try {
      const { transactionId } = req.params;
      const { provider } = req.query;

      if (!transactionId) {
        return res.status(400).json({
          status: 'error',
          message: 'Transaction ID is required'
        });
      }

      const paymentProvider = (provider as string) || 'MOMO_PAY';
      const result = await this.paymentService.verifyPayment(
        transactionId,
        paymentProvider as any
      );

      res.json({
        status: 'success',
        data: result
      });

    } catch (error) {
      console.error('Payment verification error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Payment verification failed',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  };

  /**
   * Get payment history for the authenticated user
   * GET /api/payments/history
   */
  getPaymentHistory = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

      if (!userId) {
        return res.status(401).json({
          status: 'error',
          message: 'User not authenticated'
        });
      }

      const result = await this.paymentService.getPaymentHistory(userId, page, limit);

      res.json({
        status: 'success',
        data: result
      });

    } catch (error) {
      console.error('Get payment history error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to retrieve payment history',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  };

  /**
   * Retry a failed payment
   * POST /api/payments/retry/:paymentId
   */
  retryPayment = async (req: Request, res: Response) => {
    try {
      const { paymentId } = req.params;

      if (!paymentId) {
        return res.status(400).json({
          status: 'error',
          message: 'Payment ID is required'
        });
      }

      const result = await this.paymentService.retryPayment(paymentId);

      res.json({
        status: 'success',
        message: 'Payment retry initiated',
        data: result
      });

    } catch (error) {
      console.error('Payment retry error:', error);
      res.status(500).json({
        status: 'error',
        message: error instanceof Error ? error.message : 'Payment retry failed',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  };

  /**
   * Get payment statistics
   * GET /api/payments/stats
   */
  getPaymentStats = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          status: 'error',
          message: 'User not authenticated'
        });
      }

      const stats = await this.paymentService.getPaymentStats(userId);

      res.json({
        status: 'success',
        data: stats
      });

    } catch (error) {
      console.error('Get payment stats error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to retrieve payment statistics',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  };


  /**
   * Get payment methods available to user
   * GET /api/payments/methods
   */
  getPaymentMethods = async (req: Request, res: Response) => {
    try {
      const paymentMethods = [
        {
          id: 'MOMO_PAY',
          name: 'MTN Mobile Money',
          description: 'Pay with your MTN Mobile Money account',
          requiresPhone: true,
          currencies: ['RWF'],
          icon: 'momo-icon',
          isActive: true
        },
        {
          id: 'PAYPACK',
          name: 'Paypack',
          description: 'Pay with MTN Mobile Money or Airtel Money through Paypack',
          requiresPhone: true,
          currencies: ['RWF'],
          icon: 'paypack-icon',
          isActive: true,
          supportedNetworks: ['MTN Mobile Money', 'Airtel Money'],
          features: ['instant_payments', 'payment_verification', 'refunds']
        },
        {
          id: 'CASH',
          name: 'Cash on Delivery',
          description: 'Pay with cash when your order is delivered',
          requiresPhone: false,
          currencies: ['RWF'],
          icon: 'cash-icon',
          isActive: true
        }
        // Future payment methods can be added here
      ];

      res.json({
        status: 'success',
        data: paymentMethods
      });

    } catch (error) {
      console.error('Get payment methods error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to retrieve payment methods',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  };

  /**
   * Admin endpoint: Manually confirm a payment
   * PATCH /api/payments/admin/confirm/:paymentId
   * 
   * TEMPORARY: For manual payment confirmation while MoMo integration is paused
   */
  adminConfirmPayment = async (req: Request, res: Response) => {
    try {
      const { paymentId } = req.params;
      const { status, reason } = req.body;

      if (!paymentId) {
        return res.status(400).json({
          status: 'error',
          message: 'Payment ID is required'
        });
      }

      if (!status || !['PAID', 'FAILED'].includes(status)) {
        return res.status(400).json({
          status: 'error',
          message: 'Status must be either PAID or FAILED'
        });
      }

      // TODO: Add admin role check
      // const userRole = req.user?.role;
      // if (userRole !== 'admin') {
      //   return res.status(403).json({
      //     status: 'error',
      //     message: 'Admin access required'
      //   });
      // }

      const result = await this.paymentService.adminConfirmPayment(paymentId, status, reason);

      res.json({
        status: 'success',
        message: `Payment ${status === 'PAID' ? 'confirmed' : 'marked as failed'} successfully`,
        data: result
      });

    } catch (error) {
      console.error('Admin payment confirmation error:', error);
      res.status(500).json({
        status: 'error',
        message: error instanceof Error ? error.message : 'Payment confirmation failed',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  };
} 