import prisma from '../lib/prisma';
import { OrderStatus, PaymentStatus } from '@prisma/client';

// Notification types enum
export enum NotificationType {
  // Order related
  ORDER_PLACED = 'ORDER_PLACED',
  ORDER_CONFIRMED = 'ORDER_CONFIRMED',
  ORDER_PREPARING = 'ORDER_PREPARING',
  ORDER_READY = 'ORDER_READY',
  ORDER_PICKED_UP = 'ORDER_PICKED_UP',
  ORDER_IN_TRANSIT = 'ORDER_IN_TRANSIT',
  ORDER_DELIVERED = 'ORDER_DELIVERED',
  ORDER_CANCELLED = 'ORDER_CANCELLED',
  ORDER_REFUNDED = 'ORDER_REFUNDED',
  
  // Payment related
  PAYMENT_CREATED = 'PAYMENT_CREATED',
  PAYMENT_SUCCESSFUL = 'PAYMENT_SUCCESSFUL',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  PAYMENT_REFUNDED = 'PAYMENT_REFUNDED',
  
  // Delivery related
  DELIVERY_ASSIGNED = 'DELIVERY_ASSIGNED',
  DELIVERY_STARTED = 'DELIVERY_STARTED',
  DELIVERY_COMPLETED = 'DELIVERY_COMPLETED',
  DELIVERY_FAILED = 'DELIVERY_FAILED',
  
  // Review related
  NEW_REVIEW = 'NEW_REVIEW',
  REVIEW_RESPONSE = 'REVIEW_RESPONSE',
  
  // System related
  ACCOUNT_VERIFIED = 'ACCOUNT_VERIFIED',
  ACCOUNT_SUSPENDED = 'ACCOUNT_SUSPENDED',
  PROMOTION_OFFER = 'PROMOTION_OFFER',
  SYSTEM_MAINTENANCE = 'SYSTEM_MAINTENANCE'
}

interface NotificationData {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  metadata?: any;
}

export class NotificationHelperService {
  /**
   * Create notification for a single user
   */
  private async createNotification(data: NotificationData) {
    try {
      // Check if user has push notifications enabled
      const user = await prisma.user.findUnique({
        where: { id: data.userId },
        select: { pushNotificationsEnabled: true }
      });

      if (!user?.pushNotificationsEnabled) {
        return null; // Skip notification if disabled
      }

      return await prisma.notification.create({
        data: {
          userId: data.userId,
          title: data.title,
          message: data.message,
          type: data.type,
          metadata: data.metadata || {}
        }
      });
    } catch (error) {
      console.error('Error creating notification:', error);
      return null;
    }
  }

  /**
   * Create notifications for multiple users
   */
  private async createBulkNotifications(notifications: NotificationData[]) {
    try {
      const validNotifications = notifications.filter(n => n.userId);
      
      if (validNotifications.length === 0) return [];

      // Check which users have push notifications enabled
      const userIds = [...new Set(validNotifications.map(n => n.userId))];
      const users = await prisma.user.findMany({
        where: { 
          id: { in: userIds },
          pushNotificationsEnabled: true
        },
        select: { id: true }
      });

      const enabledUserIds = new Set(users.map(u => u.id));
      const filteredNotifications = validNotifications.filter(n => enabledUserIds.has(n.userId));

      if (filteredNotifications.length === 0) return [];

      return await prisma.notification.createMany({
        data: filteredNotifications.map(n => ({
          userId: n.userId,
          title: n.title,
          message: n.message,
          type: n.type,
          metadata: n.metadata || {}
        }))
      });
    } catch (error) {
      console.error('Error creating bulk notifications:', error);
      return [];
    }
  }

  // ==================== ORDER NOTIFICATIONS ====================

  /**
   * Handle order placed notifications
   */
  async handleOrderPlaced(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: { include: { user: true } },
        merchant: { include: { user: true } },
        items: { include: { product: true } }
      }
    });

    if (!order) return;

    const orderNumber = order.id.slice(-8).toUpperCase();
    const totalAmount = Number(order.total).toLocaleString('en-US', { 
      style: 'currency', 
      currency: 'RWF' 
    });

    // Customer notification
    await this.createNotification({
      userId: order.customer.user.id,
      title: 'Order Placed Successfully',
      message: `Your order #${orderNumber} has been placed successfully. Total: ${totalAmount}`,
      type: NotificationType.ORDER_PLACED,
      metadata: {
        orderId: order.id,
        orderNumber,
        totalAmount: Number(order.total),
        merchantName: order.merchant.businessName,
        itemCount: order.items.length
      }
    });

    // Merchant notification
    await this.createNotification({
      userId: order.merchant.user.id,
      title: 'New Order Received',
      message: `New order #${orderNumber} received. Total: ${totalAmount}`,
      type: NotificationType.ORDER_PLACED,
      metadata: {
        orderId: order.id,
        orderNumber,
        totalAmount: Number(order.total),
        customerName: order.customer.user.fullName,
        itemCount: order.items.length
      }
    });
  }

  /**
   * Handle order status change notifications
   */
  async handleOrderStatusChange(orderId: string, oldStatus: OrderStatus, newStatus: OrderStatus) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: { include: { user: true } },
        merchant: { include: { user: true } }
      }
    });

    if (!order) return;

    const orderNumber = order.id.slice(-8).toUpperCase();
    const totalAmount = Number(order.total).toLocaleString('en-US', { 
      style: 'currency', 
      currency: 'RWF' 
    });

    // Define status-specific notifications
    const statusNotifications: Record<string, {
      customer: {
        title: string;
        message: string;
        type: NotificationType;
      };
      merchant: {
        title: string;
        message: string;
        type: NotificationType;
      };
    }> = {
      [OrderStatus.CONFIRMED]: {
        customer: {
          title: 'Order Confirmed',
          message: `Your order #${orderNumber} has been confirmed by ${order.merchant.businessName}`,
          type: NotificationType.ORDER_CONFIRMED
        },
        merchant: {
          title: 'Order Confirmed',
          message: `Order #${orderNumber} has been confirmed`,
          type: NotificationType.ORDER_CONFIRMED
        }
      },
      [OrderStatus.PREPARING]: {
        customer: {
          title: 'Order Being Prepared',
          message: `${order.merchant.businessName} is preparing your order #${orderNumber}`,
          type: NotificationType.ORDER_PREPARING
        },
        merchant: {
          title: 'Order Preparation Started',
          message: `Started preparing order #${orderNumber}`,
          type: NotificationType.ORDER_PREPARING
        }
      },
      [OrderStatus.READY_FOR_PICKUP]: {
        customer: {
          title: 'Order Ready for Pickup',
          message: `Your order #${orderNumber} is ready for pickup at ${order.merchant.businessName}`,
          type: NotificationType.ORDER_READY
        },
        merchant: {
          title: 'Order Ready',
          message: `Order #${orderNumber} is ready for pickup`,
          type: NotificationType.ORDER_READY
        }
      },
      [OrderStatus.PICKED_UP]: {
        customer: {
          title: 'Order Picked Up',
          message: `Your order #${orderNumber} has been picked up and is on its way`,
          type: NotificationType.ORDER_PICKED_UP
        },
        merchant: {
          title: 'Order Picked Up',
          message: `Order #${orderNumber} has been picked up by delivery partner`,
          type: NotificationType.ORDER_PICKED_UP
        }
      },
      [OrderStatus.IN_TRANSIT]: {
        customer: {
          title: 'Order in Transit',
          message: `Your order #${orderNumber} is on its way to you`,
          type: NotificationType.ORDER_IN_TRANSIT
        },
        merchant: {
          title: 'Order in Transit',
          message: `Order #${orderNumber} is being delivered`,
          type: NotificationType.ORDER_IN_TRANSIT
        }
      },
      [OrderStatus.DELIVERED]: {
        customer: {
          title: 'Order Delivered',
          message: `Your order #${orderNumber} has been delivered successfully!`,
          type: NotificationType.ORDER_DELIVERED
        },
        merchant: {
          title: 'Order Delivered',
          message: `Order #${orderNumber} has been delivered successfully`,
          type: NotificationType.ORDER_DELIVERED
        }
      },
      [OrderStatus.CANCELLED]: {
        customer: {
          title: 'Order Cancelled',
          message: `Your order #${orderNumber} has been cancelled`,
          type: NotificationType.ORDER_CANCELLED
        },
        merchant: {
          title: 'Order Cancelled',
          message: `Order #${orderNumber} has been cancelled`,
          type: NotificationType.ORDER_CANCELLED
        }
      },
      [OrderStatus.REFUNDED]: {
        customer: {
          title: 'Order Refunded',
          message: `Your order #${orderNumber} has been refunded`,
          type: NotificationType.ORDER_REFUNDED
        },
        merchant: {
          title: 'Order Refunded',
          message: `Order #${orderNumber} has been refunded`,
          type: NotificationType.ORDER_REFUNDED
        }
      }
    };

    const notification = statusNotifications[newStatus];
    if (!notification) return; // Skip if no notification is defined for this status

    const metadata = {
      orderId: order.id,
      orderNumber,
      totalAmount: Number(order.total),
      oldStatus,
      newStatus
    };

    // Send notifications
    await this.createBulkNotifications([
      {
        userId: order.customer.user.id,
        title: notification.customer.title,
        message: notification.customer.message,
        type: notification.customer.type,
        metadata
      },
      {
        userId: order.merchant.user.id,
        title: notification.merchant.title,
        message: notification.merchant.message,
        type: notification.merchant.type,
        metadata
      }
    ]);
  }

  // ==================== PAYMENT NOTIFICATIONS ====================

  /**
   * Handle payment created notifications
   */
  async handlePaymentCreated(paymentId: string) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        user: true
      }
    });

    if (!payment) return;

    const amount = Number(payment.amount).toLocaleString('en-US', { 
      style: 'currency', 
      currency: payment.currency 
    });

    await this.createNotification({
      userId: payment.userId,
      title: 'Payment Initiated',
      message: `Payment of ${amount} has been initiated`,
      type: NotificationType.PAYMENT_CREATED,
      metadata: {
        paymentId: payment.id,
        amount: Number(payment.amount),
        currency: payment.currency,
        method: payment.method,
        reference: payment.reference
      }
    });
  }

  /**
   * Handle payment status change notifications
   */
  async handlePaymentStatusChange(paymentId: string, oldStatus: PaymentStatus, newStatus: PaymentStatus) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        user: true
      }
    });

    if (!payment) return;

    const amount = Number(payment.amount).toLocaleString('en-US', { 
      style: 'currency', 
      currency: payment.currency 
    });

    const statusNotifications: Record<string, {
      title: string;
      message: string;
      type: NotificationType;
    }> = {
      [PaymentStatus.PAID]: {
        title: 'Payment Successful',
        message: `Payment of ${amount} has been processed successfully`,
        type: NotificationType.PAYMENT_SUCCESSFUL
      },
      [PaymentStatus.FAILED]: {
        title: 'Payment Failed',
        message: `Payment of ${amount} has failed. Please try again.`,
        type: NotificationType.PAYMENT_FAILED
      },
      [PaymentStatus.REFUNDED]: {
        title: 'Payment Refunded',
        message: `Payment of ${amount} has been refunded to your account`,
        type: NotificationType.PAYMENT_REFUNDED
      }
    };

    const notification = statusNotifications[newStatus];
    if (!notification) return; // Skip if no notification is defined for this status

    await this.createNotification({
      userId: payment.userId,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      metadata: {
        paymentId: payment.id,
        amount: Number(payment.amount),
        currency: payment.currency,
        method: payment.method,
        reference: payment.reference,
        oldStatus,
        newStatus
      }
    });
  }

  // ==================== DELIVERY NOTIFICATIONS ====================

  /**
   * Handle delivery status change notifications
   */
  async handleDeliveryStatusChange(deliveryId: string, oldStatus: string, newStatus: string) {
    const delivery = await prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: {
        order: {
          include: {
            customer: { include: { user: true } },
            merchant: { include: { user: true } }
          }
        },
        rider: { include: { user: true } }
      }
    });

    if (!delivery) return;

    const orderNumber = delivery.order.id.slice(-8).toUpperCase();

    const statusNotifications: Record<string, {
      customer: {
        title: string;
        message: string;
        type: NotificationType;
      };
      merchant: {
        title: string;
        message: string;
        type: NotificationType;
      };
    }> = {
      'ASSIGNED': {
        customer: {
          title: 'Delivery Partner Assigned',
          message: `A delivery partner has been assigned to your order #${orderNumber}`,
          type: NotificationType.DELIVERY_ASSIGNED
        },
        merchant: {
          title: 'Delivery Partner Assigned',
          message: `Delivery partner assigned to order #${orderNumber}`,
          type: NotificationType.DELIVERY_ASSIGNED
        }
      },
      'PICKED_UP': {
        customer: {
          title: 'Order Picked Up',
          message: `Your order #${orderNumber} has been picked up by the delivery partner`,
          type: NotificationType.DELIVERY_STARTED
        },
        merchant: {
          title: 'Order Picked Up',
          message: `Order #${orderNumber} has been picked up for delivery`,
          type: NotificationType.DELIVERY_STARTED
        }
      },
      'DELIVERED': {
        customer: {
          title: 'Order Delivered',
          message: `Your order #${orderNumber} has been delivered successfully!`,
          type: NotificationType.DELIVERY_COMPLETED
        },
        merchant: {
          title: 'Order Delivered',
          message: `Order #${orderNumber} has been delivered successfully`,
          type: NotificationType.DELIVERY_COMPLETED
        }
      },
      'FAILED': {
        customer: {
          title: 'Delivery Failed',
          message: `Delivery of your order #${orderNumber} has failed. We'll contact you shortly.`,
          type: NotificationType.DELIVERY_FAILED
        },
        merchant: {
          title: 'Delivery Failed',
          message: `Delivery of order #${orderNumber} has failed`,
          type: NotificationType.DELIVERY_FAILED
        }
      }
    };

    const notification = statusNotifications[newStatus];
    if (!notification) return; // Skip if no notification is defined for this status

    const metadata = {
      deliveryId: delivery.id,
      orderId: delivery.order.id,
      orderNumber,
      riderName: delivery.rider?.user.fullName,
      oldStatus,
      newStatus
    };

    await this.createBulkNotifications([
      {
        userId: delivery.order.customer.user.id,
        title: notification.customer.title,
        message: notification.customer.message,
        type: notification.customer.type,
        metadata
      },
      {
        userId: delivery.order.merchant.user.id,
        title: notification.merchant.title,
        message: notification.merchant.message,
        type: notification.merchant.type,
        metadata
      }
    ]);
  }

  // ==================== REVIEW NOTIFICATIONS ====================

  /**
   * Handle new review notifications
   */
  async handleNewReview(reviewId: string) {
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        user: true,
        merchant: { include: { user: true } },
        product: true
      }
    });

    if (!review || !review.merchant) return;

    const rating = '⭐'.repeat(review.rating);
    
    await this.createNotification({
      userId: review.merchant.user.id,
      title: 'New Review Received',
      message: `You received a ${rating} review from ${review.user.fullName}`,
      type: NotificationType.NEW_REVIEW,
      metadata: {
        reviewId: review.id,
        rating: review.rating,
        comment: review.comment,
        customerName: review.user.fullName,
        productName: review.product?.name
      }
    });
  }

  // ==================== SYSTEM NOTIFICATIONS ====================

  /**
   * Handle account verification notifications
   */
  async handleAccountVerification(userId: string, isVerified: boolean) {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) return;

    if (isVerified) {
      await this.createNotification({
        userId,
        title: 'Account Verified',
        message: 'Your account has been verified successfully!',
        type: NotificationType.ACCOUNT_VERIFIED,
        metadata: { verifiedAt: new Date() }
      });
    } else {
      await this.createNotification({
        userId,
        title: 'Account Suspended',
        message: 'Your account has been suspended. Please contact support.',
        type: NotificationType.ACCOUNT_SUSPENDED,
        metadata: { suspendedAt: new Date() }
      });
    }
  }

  /**
   * Send promotion/offer notifications
   */
  async sendPromotionNotification(userIds: string[], title: string, message: string, metadata?: any) {
    const notifications = userIds.map(userId => ({
      userId,
      title,
      message,
      type: NotificationType.PROMOTION_OFFER,
      metadata
    }));

    await this.createBulkNotifications(notifications);
  }

  /**
   * Send system maintenance notifications
   */
  async sendSystemMaintenanceNotification(userIds: string[], message: string, scheduledTime?: Date) {
    const notifications = userIds.map(userId => ({
      userId,
      title: 'System Maintenance',
      message,
      type: NotificationType.SYSTEM_MAINTENANCE,
      metadata: { scheduledTime }
    }));

    await this.createBulkNotifications(notifications);
  }
}

// Export singleton instance
export const notificationHelper = new NotificationHelperService(); 