import { 
  PaymentRequest, 
  PaymentResponse, 
  PaymentVerificationResult, 
  PaymentStatus,
  IPaymentProvider,
  PaymentProviderType
} from '../types/payment.types';
import { MoMoPaymentProvider } from './payment/momo-payment.provider';
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

  constructor() {
    this.providers = new Map();
    this.initializeProviders();
  }

  /**
   * Initialize payment providers
   */
  private initializeProviders(): void {
    // Register MoMo provider
    this.providers.set(PaymentProviderType.MOMO_PAY, new MoMoPaymentProvider());
    
    // Future providers can be added here:
    // this.providers.set(PaymentProviderType.CARD, new CardPaymentProvider());
  }

  /**
   * Process payment for an order
   */
  async processOrderPayment(
    orderId: string, 
    phoneNumber: string, 
    paymentMethod: 'MOMO_PAY' | 'CARD' | 'CASH'
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

      throw new Error(`Payment method ${paymentMethod} not yet implemented`);

    } catch (error) {
      console.error(`Error processing payment for order ${orderId}:`, error);
      throw error;
    }
  }

  /**
   * Process MoMo payment
   */
  private async processMoMoPayment(order: any, phoneNumber: string): Promise<PaymentResponse> {
    const provider = this.providers.get(PaymentProviderType.MOMO_PAY);
    if (!provider) {
      throw new Error('MoMo payment provider not available');
    }

    // Always generate a new unique reference for each payment attempt
    const paymentReference = uuidv4();

    const paymentRequest: PaymentRequest = {
      amount: Number(order.total),
      currency: paymentConfig.defaultCurrency,
      phoneNumber,
      reference: paymentReference, // Use new UUID here
      description: `Payment for order #${order.id.slice(-8)}`,
      metadata: {
        orderId: order.id,
        customerId: order.customerId,
        merchantId: order.merchantId
      }
    };

    const response = await provider.processPayment(paymentRequest);

    // Create payment record in database
    const payment = await this.createPaymentRecord({
      userId: order.customer.userId,
      orderId: order.id,
      amount: Number(order.total),
      currency: paymentConfig.defaultCurrency,
      method: 'Mobile Money',
      status: this.mapPaymentStatusToPrisma(response.status),
      reference: paymentReference, // Use the same new UUID here
      metadata: {
        ...response.metadata,
        orderId: order.id,
        attemptAt: new Date().toISOString(),
        previousReference: response.metadata?.previousReference || null
      }
    });

    // Send notification for payment created
    await notificationHelper.handlePaymentCreated(payment.id);

    // Update order payment status
    if (response.success) {
      await prisma.order.update({
        where: { id: order.id },
        data: { 
          paymentStatus: response.status === PaymentStatus.SUCCESSFUL ? 'PAID' : 'PENDING'
        }
      });
    }

    return response;
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
   */
  async verifyPayment(transactionId: string, paymentMethod: PaymentProviderType): Promise<PaymentVerificationResult> {
    const provider = this.providers.get(paymentMethod);
    if (!provider) {
      throw new Error(`Payment provider ${paymentMethod} not available`);
    }

    return await provider.verifyPayment(transactionId);
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
   * Test payment provider connectivity
   */
  async testProviders(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    for (const [providerType, provider] of this.providers) {
      try {
        results[providerType] = await provider.testConnection();
      } catch (error) {
        console.error(`Provider ${providerType} test failed:`, error);
        results[providerType] = false;
      }
    }

    return results;
  }
} 