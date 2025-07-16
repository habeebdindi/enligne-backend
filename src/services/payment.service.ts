import { 
  PaymentRequest, 
  PaymentResponse, 
  PaymentVerificationResult, 
  PaymentStatus,
  IPaymentProvider,
  PaymentProviderType,
  DisbursementType,
  DisbursementRequest
} from '../types/payment.types';
import { MoMoPaymentProvider } from './payment/momo-payment.provider';
import { PaypackPaymentProvider } from './payment/paypack-payment.provider';
import { DisbursementService } from './disbursement.service';
import { paymentConfig } from '../config/payment.config';
import prisma from '../lib/prisma';
import { PaymentStatus as PrismaPaymentStatus } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { notificationHelper } from './notification-helper.service';

/**
 * Payment Service
 * 
 * This service orchestrates all payment operations in the system:
 * - Processing payments for orders
 * - Managing payment providers
 * - Updating order and payment statuses
 * - Handling payment verification and webhooks
 * 
 * It follows the strategy pattern for different payment providers.
 */

export class PaymentService {
  private providers: Map<PaymentProviderType, IPaymentProvider>;
  private disbursementService: DisbursementService;

  constructor() {
    this.providers = new Map();
    this.disbursementService = new DisbursementService();
    this.initializeProviders();
  }

  /**
   * Initialize payment providers
   */
  private initializeProviders(): void {
    // Register MoMo provider
    this.providers.set(PaymentProviderType.MOMO_PAY, new MoMoPaymentProvider());
    
    // Register Paypack provider
    this.providers.set(PaymentProviderType.PAYPACK, new PaypackPaymentProvider());
    
    // Future providers can be added here:
    // this.providers.set(PaymentProviderType.CARD, new CardPaymentProvider());
  }

  /**
   * Process payment for an order
   */
  async processOrderPayment(
    orderId: string, 
    phoneNumber: string, 
    paymentMethod: 'MOMO_PAY' | 'PAYPACK' | 'CARD' | 'CASH'
  ): Promise<PaymentResponse> {
    try {
      console.log(`Processing payment for order ${orderId} using ${paymentMethod}`);

      // Get order details
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          customer: {
            include: {
              user: true
            }
          }
        }
      });

      if (!order) {
        throw new Error('Order not found');
      }

      if (order.paymentStatus === 'PAID') {
        throw new Error('Order is already paid');
      }

      // Handle different payment methods
      if (paymentMethod === 'CASH') {
        return this.processCashPayment(order.id);
      }

      if (paymentMethod === 'MOMO_PAY') {
        return this.processMoMoPayment(order, phoneNumber);
      }

      if (paymentMethod === 'PAYPACK') {
        return this.processPaypackPayment(order, phoneNumber);
      }

      throw new Error(`Payment method ${paymentMethod} not yet implemented`);

    } catch (error) {
      console.error(`Error processing payment for order ${orderId}:`, error);
      throw error;
    }
  }

  /**
   * Process MoMo payment
   * 
   * TEMPORARY: MoMo integration is paused.
   * Payment records are created with PENDING status for manual confirmation by admins.
   */
  private async processMoMoPayment(order: any, phoneNumber: string): Promise<PaymentResponse> {
    console.log(`Creating payment record for manual confirmation - Order: ${order.id}, Phone: ${phoneNumber}`);

    // Always generate a new unique reference for each payment attempt
    const paymentReference = uuidv4();

    // Basic phone number validation
    if (!phoneNumber || phoneNumber.trim().length === 0) {
      throw new Error('Phone number is required for MoMo payments');
    }

    // Validate phone number format (basic validation)
    const phoneRegex = /^(\+?25[0-9]|0)[0-9]{8,9}$/;
    if (!phoneRegex.test(phoneNumber.replace(/\s/g, ''))) {
      throw new Error('Invalid phone number format. Please use format: +250XXXXXXXXX or 078XXXXXXXX');
    }

    // Create payment record in database with PENDING status
    const payment = await this.createPaymentRecord({
      userId: order.customer.userId,
      orderId: order.id,
      amount: Number(order.total),
      currency: paymentConfig.defaultCurrency,
      method: 'Mobile Money',
      status: 'PENDING', // Always PENDING for manual confirmation
      reference: paymentReference,
      metadata: {
        orderId: order.id,
        customerId: order.customerId,
        merchantId: order.merchantId,
        phoneNumber: phoneNumber,
        attemptAt: new Date().toISOString(),
        note: 'MoMo integration temporarily paused - awaiting manual confirmation',
        requiresManualConfirmation: true
      }
    });

    // Send notification for payment created
    await notificationHelper.handlePaymentCreated(payment.id);

    // Update order payment status to PENDING
    await prisma.order.update({
      where: { id: order.id },
      data: { 
        paymentStatus: 'PENDING'
      }
    });

    // Return successful response indicating manual confirmation needed
    return {
      success: true,
      transactionId: paymentReference,
      reference: paymentReference,
      status: PaymentStatus.PENDING,
      message: 'Payment request created successfully. Your payment will be confirmed manually by our team. You will receive a notification once confirmed.',
      metadata: {
        orderId: order.id,
        phoneNumber: phoneNumber,
        amount: Number(order.total),
        currency: paymentConfig.defaultCurrency,
        requiresManualConfirmation: true,
        createdAt: new Date().toISOString()
      }
    };
  }

  /**
   * Process Paypack payment
   */
  private async processPaypackPayment(order: any, phoneNumber: string): Promise<PaymentResponse> {
    try {
      console.log(`Processing Paypack payment - Order: ${order.id}, Phone: ${phoneNumber}`);

      // Generate a unique reference for this payment attempt
      const paymentReference = uuidv4();

      // Basic phone number validation
      if (!phoneNumber || phoneNumber.trim().length === 0) {
        throw new Error('Phone number is required for Paypack payments');
      }

      // Create initial payment record with our reference
      const payment = await this.createPaymentRecord({
        userId: order.customer.userId,
        orderId: order.id,
        amount: Number(order.total), // Use total that already includes all fees
        currency: paymentConfig.defaultCurrency,
        method: 'Paypack',
        status: 'PENDING',
        reference: paymentReference,
        metadata: {
          orderId: order.id,
          customerId: order.customerId,
          merchantId: order.merchantId,
          phoneNumber: phoneNumber,
          attemptAt: new Date().toISOString()
        }
      });

      // Get the Paypack provider
      const paypackProvider = this.providers.get(PaymentProviderType.PAYPACK);
      if (!paypackProvider) {
        throw new Error('Paypack payment provider not available');
      }

      // Prepare payment request
      const paymentRequest: PaymentRequest = {
        amount: Number(order.total), // Use total that already includes all fees
        currency: paymentConfig.defaultCurrency,
        phoneNumber: phoneNumber,
        reference: paymentReference,
        description: `Payment for order #${order.id.slice(-8)}`,
        metadata: {
          orderId: order.id,
          customerId: order.customerId,
          merchantId: order.merchantId
        }
      };
      console.log('paymentRequest: ', paymentRequest);

      // Process payment with Paypack
      const paypackResponse = await paypackProvider.processPayment(paymentRequest);

      // Update payment record with Paypack reference for webhook lookups
      if (paypackResponse.success && paypackResponse.transactionId) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            reference: paypackResponse.transactionId, // Use Paypack's ref for webhook lookups
            metadata: {
              ...payment.metadata as any,
              ...paypackResponse.metadata,
              internalReference: paymentReference, // Keep our original reference
              paypackRef: paypackResponse.transactionId,
              paypackStatus: paypackResponse.status
            }
          }
        });
        
        console.log(`Payment record updated with Paypack reference: ${paypackResponse.transactionId}`);
      }

      // Send notification for payment created
      await notificationHelper.handlePaymentCreated(payment.id);

      // Update order payment status
      await prisma.order.update({
        where: { id: order.id },
        data: { 
          paymentStatus: this.mapPaymentStatusToPrisma(paypackResponse.status)
        }
      });

      return {
        success: paypackResponse.success,
        transactionId: paypackResponse.transactionId,
        reference: paymentReference, // Return our internal reference to the client
        status: paypackResponse.status,
        message: paypackResponse.message,
        metadata: {
          ...paypackResponse.metadata,
          orderId: order.id,
          phoneNumber: phoneNumber,
          amount: Number(order.total),
          currency: paymentConfig.defaultCurrency,
          createdAt: new Date().toISOString(),
          paypackRef: paypackResponse.transactionId
        }
      };

    } catch (error) {
      console.error('Paypack payment processing failed:', error);
      
      // Create failed payment record
      await this.createPaymentRecord({
        userId: order.customer.userId,
        orderId: order.id,
        amount: Number(order.total),
        currency: paymentConfig.defaultCurrency,
        method: 'Paypack',
        status: 'FAILED',
        reference: uuidv4(),
        metadata: {
          orderId: order.id,
          phoneNumber: phoneNumber,
          error: error instanceof Error ? error.message : 'Unknown error',
          attemptAt: new Date().toISOString()
        }
      });

      throw error;
    }
  }

  /**
   * Process cash payment (mark as pending until delivery)
   */
  private async processCashPayment(orderId: string): Promise<PaymentResponse> {
    await prisma.order.update({
      where: { id: orderId },
      data: { 
        paymentStatus: 'PENDING' // Will be updated to PAID upon delivery
      }
    });

    return {
      success: true,
      transactionId: `cash_${orderId}`,
      reference: orderId,
      status: PaymentStatus.PENDING,
      message: 'Cash payment will be collected upon delivery'
    };
  }

  /**
   * Verify payment status
   * 
   * TEMPORARY: Returns payment status from database instead of calling external provider
   * since MoMo integration is paused.
   */
  async verifyPayment(transactionId: string, paymentMethod: PaymentProviderType): Promise<PaymentVerificationResult> {
    console.log(`Verifying payment status for transaction: ${transactionId}`);

    try {
      // Find payment record in database
      const payment = await prisma.payment.findUnique({
        where: { reference: transactionId }
      });

      if (!payment) {
        return {
          isValid: false,
          status: PaymentStatus.FAILED,
          amount: 0,
          currency: paymentConfig.defaultCurrency,
          transactionId,
          reference: transactionId,
          failureReason: 'Payment record not found'
        };
      }

      // Map database status to PaymentStatus enum
      let paymentStatus: PaymentStatus;
      switch (payment.status) {
        case 'PAID':
          paymentStatus = PaymentStatus.SUCCESSFUL;
          break;
        case 'FAILED':
          paymentStatus = PaymentStatus.FAILED;
          break;
        case 'PENDING':
        default:
          paymentStatus = PaymentStatus.PENDING;
          break;
      }

      const metadata = payment.metadata as any;

      return {
        isValid: true,
        status: paymentStatus,
        amount: Number(payment.amount),
        currency: payment.currency,
        transactionId,
        reference: payment.reference,
        completedAt: payment.status === 'PAID' ? payment.updatedAt : undefined,
        failureReason: payment.status === 'FAILED' ? metadata?.failureReason : undefined
      };

    } catch (error) {
      console.error(`Error verifying payment ${transactionId}:`, error);

      return {
        isValid: false,
        status: PaymentStatus.FAILED,
        amount: 0,
        currency: paymentConfig.defaultCurrency,
        transactionId,
        reference: transactionId,
        failureReason: error instanceof Error ? error.message : 'Verification failed'
      };
    }
  }

  /**
   * Handle payment webhook/callback
   */
  async handlePaymentWebhook(
    transactionId: string, 
    status: PaymentStatus, 
    metadata?: any
  ): Promise<void> {
    try {
      console.log(`Processing payment webhook for transaction ${transactionId}, status: ${status}`);

      // Find payment record
      const payment = await prisma.payment.findUnique({
        where: { reference: transactionId }
      });

      if (!payment) {
        console.warn(`Payment record not found for transaction ${transactionId}`);
        return;
      }

      const oldStatus = payment.status;

      // Update payment status
      await prisma.payment.update({
        where: { id: payment.id },
        data: { 
          status: this.mapPaymentStatusToPrisma(status),
          metadata: {
            ...payment.metadata as any,
            ...metadata,
            updatedAt: new Date().toISOString()
          }
        }
      });

      // Send notification for payment status change
      await notificationHelper.handlePaymentStatusChange(payment.id, oldStatus, this.mapPaymentStatusToPrisma(status));

      // Update related order if payment is successful
      if (status === PaymentStatus.SUCCESSFUL) {
        const orderMetadata = payment.metadata as any;
        if (orderMetadata?.orderId) {
          await this.updateOrderPaymentStatus(orderMetadata.orderId, 'PAID');
          
          // Create automatic disbursement to merchant
          await this.createMerchantDisbursement(orderMetadata.orderId, Number(payment.amount));
        }
      }

    } catch (error) {
      console.error(`Error processing payment webhook:`, error);
      throw error;
    }
  }

  /**
   * Update order payment status and trigger next steps
   */
  private async updateOrderPaymentStatus(orderId: string, status: PrismaPaymentStatus): Promise<void> {
    await prisma.order.update({
      where: { id: orderId },
      data: { paymentStatus: status }
    });

    // If payment is successful, move order to CONFIRMED status
    if (status === 'PAID') {
      await prisma.order.update({
        where: { id: orderId },
        data: { status: 'CONFIRMED' }
      });
    }
  }

  /**
   * Create automatic disbursement to merchant for successful payment
   */
  private async createMerchantDisbursement(orderId: string, paymentAmount: number): Promise<void> {
    try {
      console.log(`💰 Creating automatic merchant disbursement for order: ${orderId}`);

      // Get order details with merchant information
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          merchant: {
            include: {
              user: true
            }
          }
        }
      });

      if (!order) {
        console.error(`❌ Order ${orderId} not found for disbursement`);
        return;
      }

      if (!order.merchant) {
        console.error(`❌ Merchant not found for order ${orderId}`);
        return;
      }

      // Calculate merchant payout amount (payment amount minus platform fee)
      const platformFee = Number(order.platformFee);
      const deliveryFee = Number(order.deliveryFee);
      const subtotal = Number(order.subtotal);
      const merchantPayoutAmount = subtotal - platformFee; // Merchant gets the subtotal (product revenue)

      if (merchantPayoutAmount <= 0) {
        console.warn(`⚠️ Merchant payout amount is ${merchantPayoutAmount} for order ${orderId}, skipping disbursement`);
        return;
      }

      // Create disbursement request
      const disbursementRequest: DisbursementRequest = {
        type: DisbursementType.MERCHANT_PAYOUT,
        amount: merchantPayoutAmount,
        currency: 'RWF',
        phoneNumber: order.merchant.user.phone || order.merchant.businessPhone,
        recipientName: order.merchant.businessName,
        description: `Merchant payout for order ${orderId}`,
        reference: `MERCHANT_PAYOUT_${orderId}_${Date.now()}`,
        requiresApproval: false, // Auto-approve merchant payouts for successful payments
        metadata: {
          orderId: orderId,
          merchantId: order.merchant.id,
          subtotal: subtotal,
          platformFee: platformFee,
          deliveryFee: deliveryFee,
          autoGenerated: true,
          reason: 'Automatic payout for successful payment'
        }
      };

      // Create the disbursement
      const result = await this.disbursementService.createDisbursement(disbursementRequest, 'system');

      console.log(`✅ Created automatic disbursement ${result.disbursementId} for merchant ${order.merchant.businessName} (${merchantPayoutAmount} RWF)`);

    } catch (error) {
      console.error(`❌ Error creating merchant disbursement for order ${orderId}:`, error);
      // Don't throw error to prevent payment webhook from failing
      // Merchant disbursement can be created manually if automatic fails
    }
  }

  /**
   * Create payment record in database
   */
  private async createPaymentRecord(data: {
    userId: string;
    orderId: string;
    amount: number;
    currency: string;
    method: string;
    status: PrismaPaymentStatus;
    reference: string;
    metadata?: any;
  }): Promise<any> {
    return await prisma.payment.create({
      data: {
        userId: data.userId,
        amount: data.amount,
        currency: data.currency,
        method: data.method,
        status: data.status,
        reference: data.reference,
        metadata: {
          ...data.metadata,
          orderId: data.orderId,
          createdAt: new Date().toISOString()
        }
      }
    });
  }

  /**
   * Get payment history for a user
   */
  async getPaymentHistory(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.payment.count({
        where: { userId }
      })
    ]);

    return {
      payments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Retry failed payment
   */
  async retryPayment(paymentId: string): Promise<PaymentResponse> {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId }
    });

    if (!payment) {
      throw new Error('Payment not found');
    }

    if (payment.status === 'PAID') {
      throw new Error('Payment is already successful');
    }

    const metadata = payment.metadata as any;
    if (!metadata?.orderId) {
      throw new Error('Order information not found in payment metadata');
    }

    // Get the order and retry payment
    const order = await prisma.order.findUnique({
      where: { id: metadata.orderId },
      include: {
        customer: { include: { user: true } }
      }
    });

    if (!order) {
      throw new Error('Order not found');
    }

    // Always generate a new unique reference for each retry
    const newReference = uuidv4();

    // Retry based on original payment method
    if (payment.method === 'Mobile Money') {
      // Pass the new reference and track the previous one in metadata
      const response = await this.providers.get(PaymentProviderType.MOMO_PAY)!.processPayment({
        amount: Number(order.total),
        currency: paymentConfig.defaultCurrency,
        phoneNumber: metadata.phoneNumber,
        reference: newReference,
        description: `Payment for order #${order.id.slice(-8)} (Retry)`,
        metadata: {
          ...metadata,
          previousReference: payment.reference,
          retry: true
        }
      });

      // Create a new payment record for the retry
      await this.createPaymentRecord({
        userId: order.customer.userId,
        orderId: order.id,
        amount: Number(order.total),
        currency: paymentConfig.defaultCurrency,
        method: 'Mobile Money',
        status: this.mapPaymentStatusToPrisma(response.status),
        reference: newReference,
        metadata: {
          ...response.metadata,
          orderId: order.id,
          attemptAt: new Date().toISOString(),
          previousReference: payment.reference,
          retry: true
        }
      });

      return response;
    }

    if (payment.method === 'Paypack') {
      // Pass the new reference and track the previous one in metadata
      const response = await this.providers.get(PaymentProviderType.PAYPACK)!.processPayment({
        amount: Number(order.total),
        currency: paymentConfig.defaultCurrency,
        phoneNumber: metadata.phoneNumber,
        reference: newReference,
        description: `Payment for order #${order.id.slice(-8)} (Retry)`,
        metadata: {
          ...metadata,
          previousReference: payment.reference,
          retry: true
        }
      });

      // Create a new payment record for the retry
      await this.createPaymentRecord({
        userId: order.customer.userId,
        orderId: order.id,
        amount: Number(order.total),
        currency: paymentConfig.defaultCurrency,
        method: 'Paypack',
        status: this.mapPaymentStatusToPrisma(response.status),
        reference: newReference,
        metadata: {
          ...response.metadata,
          orderId: order.id,
          attemptAt: new Date().toISOString(),
          previousReference: payment.reference,
          retry: true
        }
      });

      return response;
    }

    throw new Error(`Retry not supported for payment method: ${payment.method}`);
  }

  /**
   * Map internal payment status to Prisma payment status
   */
  private mapPaymentStatusToPrisma(status: PaymentStatus): PrismaPaymentStatus {
    switch (status) {
      case PaymentStatus.SUCCESSFUL:
        return 'PAID';
      case PaymentStatus.FAILED:
      case PaymentStatus.CANCELLED:
      case PaymentStatus.EXPIRED:
        return 'FAILED';
      case PaymentStatus.PENDING:
      case PaymentStatus.PROCESSING:
      default:
        return 'PENDING';
    }
  }

  /**
   * Get payment statistics
   */
  async getPaymentStats(userId?: string) {
    const whereClause = userId ? { userId } : {};

    const [
      totalPayments,
      successfulPayments,
      totalAmount,
      recentPayments
    ] = await Promise.all([
      prisma.payment.count({ where: whereClause }),
      prisma.payment.count({ where: { ...whereClause, status: 'PAID' } }),
      prisma.payment.aggregate({
        where: { ...whereClause, status: 'PAID' },
        _sum: { amount: true }
      }),
      prisma.payment.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: 5
      })
    ]);

    return {
      totalPayments,
      successfulPayments,
      failedPayments: totalPayments - successfulPayments,
      totalAmount: Number(totalAmount._sum.amount) || 0,
      successRate: totalPayments > 0 ? (successfulPayments / totalPayments) * 100 : 0,
      recentPayments
    };
  }

  /**
   * Admin method: Manually confirm or reject a payment
   * 
   * TEMPORARY: For manual payment confirmation while MoMo integration is paused
   */
  async adminConfirmPayment(
    paymentId: string, 
    status: 'PAID' | 'FAILED', 
    reason?: string
  ): Promise<any> {
    try {
      console.log(`Admin confirming payment ${paymentId} with status ${status}`);

      // Find the payment
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId }
      });

      if (!payment) {
        throw new Error('Payment not found');
      }

      if (payment.status !== 'PENDING') {
        throw new Error(`Payment is already ${payment.status}. Only PENDING payments can be confirmed.`);
      }

      const oldStatus = payment.status;
      const newStatus = status;

      // Update payment status
      const updatedPayment = await prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: newStatus,
          metadata: {
            ...payment.metadata as any,
            adminConfirmedAt: new Date().toISOString(),
            adminConfirmedBy: 'admin', // TODO: Get actual admin ID from request
            confirmationReason: reason || 'Manual confirmation',
            previousStatus: oldStatus
          }
        }
      });

      // Send notification for payment status change
      await notificationHelper.handlePaymentStatusChange(paymentId, oldStatus, newStatus);

      // Update related order if payment is confirmed as paid
      if (status === 'PAID') {
        const metadata = payment.metadata as any;
        if (metadata?.orderId) {
          await this.updateOrderPaymentStatus(metadata.orderId, 'PAID');
          console.log(`Order ${metadata.orderId} payment status updated to PAID`);
        }
      }

      return {
        id: updatedPayment.id,
        status: updatedPayment.status,
        reference: updatedPayment.reference,
        amount: Number(updatedPayment.amount),
        currency: updatedPayment.currency,
        confirmedAt: new Date().toISOString(),
        reason: reason || 'Manual confirmation'
      };

    } catch (error) {
      console.error(`Error confirming payment ${paymentId}:`, error);
      throw error;
    }
  }
} 