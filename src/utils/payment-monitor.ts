import { PaymentService } from '../services/payment.service';
import { PaymentProviderType, PaymentStatus } from '../types/payment.types';
import prisma from '../lib/prisma';

/**
 * Payment Monitor
 * 
 * Background service that monitors pending payments and updates their status.
 * This is crucial for MoMo payments as they are asynchronous.
 */

export class PaymentMonitor {
  private paymentService: PaymentService;
  private isRunning: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;

  constructor() {
    this.paymentService = new PaymentService();
  }

  /**
   * Start the payment monitoring service
   */
  start(intervalMinutes: number = 2): void {
    if (this.isRunning) {
      console.warn('Payment monitor is already running');
      return;
    }

    console.log(`Starting payment monitor with ${intervalMinutes} minute intervals`);
    this.isRunning = true;

    // Run immediately
    this.checkPendingPayments().catch(error => {
      console.error('Initial payment check failed:', error);
    });

    // Set up periodic checks
    this.intervalId = setInterval(() => {
      this.checkPendingPayments().catch(error => {
        console.error('Payment check failed:', error);
      });
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Stop the payment monitoring service
   */
  stop(): void {
    if (!this.isRunning) return;

    console.log('Stopping payment monitor');
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Check all pending payments and update their status
   */
  async checkPendingPayments(): Promise<void> {
    try {
      console.log('Checking pending payments...');

      // Get pending payments from the last 24 hours
      const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const pendingPayments = await prisma.payment.findMany({
        where: {
          status: 'PENDING',
          createdAt: {
            gte: cutoffTime
          }
        },
        take: 50 // Limit to prevent overload
      });

      console.log(`Found ${pendingPayments.length} pending payments to check`);

      for (const payment of pendingPayments) {
        await this.checkSinglePayment(payment);
        
        // Add a small delay to avoid rate limiting
        await this.delay(100);
      }

      // Mark old pending payments as expired
      await this.markExpiredPayments();

    } catch (error) {
      console.error('Error checking pending payments:', error);
    }
  }

  /**
   * Check a single payment status
   */
  private async checkSinglePayment(payment: any): Promise<void> {
    try {
      console.log(`Checking payment ${payment.id} (${payment.reference})`);

      // Determine provider type based on payment method
      let providerType: PaymentProviderType;
      if (payment.method === 'Mobile Money') {
        providerType = PaymentProviderType.MOMO_PAY;
      } else {
        console.log(`Skipping non-digital payment: ${payment.method}`);
        return;
      }

      // Verify payment status with provider
      const verificationResult = await this.paymentService.verifyPayment(
        payment.reference,
        providerType
      );

      // Only update if status has changed
      if (this.mapPaymentStatusToPrisma(verificationResult.status) !== payment.status) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: this.mapPaymentStatusToPrisma(verificationResult.status),
            metadata: {
              ...payment.metadata as any,
              lastChecked: new Date().toISOString(),
              verificationResult: {
                status: verificationResult.status,
                amount: verificationResult.amount,
                completedAt: verificationResult.completedAt,
                failureReason: verificationResult.failureReason
              }
            }
          }
        });

        console.log(`Updated payment ${payment.id} status to ${verificationResult.status}`);

        // Handle successful payments
        if (verificationResult.status === PaymentStatus.SUCCESSFUL) {
          await this.paymentService.handlePaymentWebhook(
            payment.reference,
            PaymentStatus.SUCCESSFUL,
            {
              checkedByMonitor: true,
              completedAt: verificationResult.completedAt
            }
          );
        }
      }

    } catch (error) {
      console.error(`Error checking payment ${payment.id}:`, error);
      
      // Update last checked time even if verification failed
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          metadata: {
            ...payment.metadata as any,
            lastChecked: new Date().toISOString(),
            lastError: error instanceof Error ? error.message : 'Unknown error'
          }
        }
      }).catch(updateError => {
        console.error('Failed to update payment metadata:', updateError);
      });
    }
  }

  /**
   * Mark payments as expired if they've been pending too long
   */
  private async markExpiredPayments(): Promise<void> {
    try {
      const expirationTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours

      const expiredPayments = await prisma.payment.updateMany({
        where: {
          status: 'PENDING',
          createdAt: {
            lt: expirationTime
          }
        },
        data: {
          status: 'FAILED'
        }
      });

      if (expiredPayments.count > 0) {
        console.log(`Marked ${expiredPayments.count} payments as expired`);
      }

    } catch (error) {
      console.error('Error marking expired payments:', error);
    }
  }

  /**
   * Map internal payment status to Prisma payment status
   */
  private mapPaymentStatusToPrisma(status: PaymentStatus): 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'PARTIALLY_REFUNDED' {
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
   * Utility function to add delays between operations
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get monitoring statistics
   */
  async getMonitoringStats(): Promise<{
    isRunning: boolean;
    totalPendingPayments: number;
    recentChecks: number;
    lastCheckTime?: Date;
  }> {
    const cutoffTime = new Date(Date.now() - 60 * 60 * 1000); // Last hour

    const [totalPending, recentChecks] = await Promise.all([
      prisma.payment.count({
        where: { status: 'PENDING' }
      }),
      prisma.payment.count({
        where: {
          metadata: {
            path: ['lastChecked'],
            gte: cutoffTime.toISOString()
          }
        }
      })
    ]);

    return {
      isRunning: this.isRunning,
      totalPendingPayments: totalPending,
      recentChecks,
      lastCheckTime: this.isRunning ? new Date() : undefined
    };
  }

  /**
   * Force check a specific payment
   */
  async forceCheckPayment(paymentId: string): Promise<void> {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId }
    });

    if (!payment) {
      throw new Error('Payment not found');
    }

    if (payment.status !== 'PENDING') {
      throw new Error('Payment is not in pending status');
    }

    await this.checkSinglePayment(payment);
  }
}

// Create singleton instance
export const paymentMonitor = new PaymentMonitor();

// Auto-start in production (can be controlled via environment variable)
if (process.env.NODE_ENV === 'production' && process.env.DISABLE_PAYMENT_MONITOR !== 'true') {
  process.nextTick(() => {
    paymentMonitor.start(2); // Check every 2 minutes
  });
} 