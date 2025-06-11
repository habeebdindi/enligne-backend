import prisma from '../lib/prisma';

interface NotificationFilters {
  page: number;
  limit: number;
  type?: string;
  isRead?: boolean;
}

interface NotificationResult {
  notifications: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  unreadCount: number;
}

class NotificationService {
  /**
   * Get all notifications for a user with pagination and filters
   * Returns notifications with pagination metadata and unread count
   */
  async getAllNotifications(userId: string, filters: NotificationFilters): Promise<NotificationResult> {
    const { page, limit, type, isRead } = filters;
    const skip = (page - 1) * limit;

    // Build the where clause
    const where: any = {
      userId,
    };

    if (type) {
      where.type = type;
    }

    if (isRead !== undefined) {
      where.isRead = isRead;
    }

    // Get total count for pagination
    const total = await prisma.notification.count({ where });

    // Get notifications with pagination
    const notifications = await prisma.notification.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: limit,
      select: {
        id: true,
        title: true,
        message: true,
        type: true,
        isRead: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Get unread count
    const unreadCount = await prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });

    const totalPages = Math.ceil(total / limit);

    return {
      notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      unreadCount,
    };
  }

  /**
   * Get count of unread notifications for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    return await prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });
  }

  /**
   * Get a specific notification by ID
   * Only returns if it belongs to the specified user
   */
  async getNotificationById(notificationId: string, userId: string) {
    return await prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId,
      },
      select: {
        id: true,
        title: true,
        message: true,
        type: true,
        isRead: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Mark a specific notification as read
   * Only updates if it belongs to the specified user
   */
  async markAsRead(notificationId: string, userId: string) {
    try {
      // First check if the notification exists and belongs to the user
      const existingNotification = await prisma.notification.findFirst({
        where: {
          id: notificationId,
          userId,
        },
      });

      if (!existingNotification) {
        return null;
      }

      // Update the notification
      return await prisma.notification.update({
        where: {
          id: notificationId,
        },
        data: {
          isRead: true,
          updatedAt: new Date(),
        },
        select: {
          id: true,
          title: true,
          message: true,
          type: true,
          isRead: true,
          metadata: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read for a user
   * Returns the count of updated notifications
   */
  async markAllAsRead(userId: string): Promise<number> {
    try {
      const result = await prisma.notification.updateMany({
        where: {
          userId,
          isRead: false, // Only update unread notifications
        },
        data: {
          isRead: true,
          updatedAt: new Date(),
        },
      });

      return result.count;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  /**
   * Delete a specific notification
   * Only deletes if it belongs to the specified user
   */
  async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    try {
      // First check if the notification exists and belongs to the user
      const existingNotification = await prisma.notification.findFirst({
        where: {
          id: notificationId,
          userId,
        },
      });

      if (!existingNotification) {
        return false;
      }

      // Delete the notification
      await prisma.notification.delete({
        where: {
          id: notificationId,
        },
      });

      return true;
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }

  /**
   * Clear all notifications for a user (delete all)
   * Returns the count of deleted notifications
   */
  async clearAllNotifications(userId: string): Promise<number> {
    try {
      const result = await prisma.notification.deleteMany({
        where: {
          userId,
        },
      });

      return result.count;
    } catch (error) {
      console.error('Error clearing all notifications:', error);
      throw error;
    }
  }

  /**
   * Create a new notification (utility method for other services)
   * This method can be used by other parts of the application to create notifications
   */
  async createNotification(data: {
    userId: string;
    title: string;
    message: string;
    type: string;
    metadata?: any;
  }) {
    try {
      return await prisma.notification.create({
        data: {
          userId: data.userId,
          title: data.title,
          message: data.message,
          type: data.type,
          metadata: data.metadata || {},
          isRead: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        select: {
          id: true,
          title: true,
          message: true,
          type: true,
          isRead: true,
          metadata: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Create multiple notifications at once (bulk creation)
   * Useful for system-wide notifications or bulk operations
   */
  async createBulkNotifications(notifications: Array<{
    userId: string;
    title: string;
    message: string;
    type: string;
    metadata?: any;
  }>) {
    try {
      const data = notifications.map(notification => ({
        userId: notification.userId,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        metadata: notification.metadata || {},
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      const result = await prisma.notification.createMany({
        data,
        skipDuplicates: true,
      });

      return result.count;
    } catch (error) {
      console.error('Error creating bulk notifications:', error);
      throw error;
    }
  }

  /**
   * Get notification statistics for a user
   * Returns counts by type and read status
   */
  async getNotificationStats(userId: string) {
    try {
      const [total, unread, byType] = await Promise.all([
        // Total notifications
        prisma.notification.count({
          where: { userId },
        }),
        
        // Unread notifications
        prisma.notification.count({
          where: { userId, isRead: false },
        }),
        
        // Group by type
        prisma.notification.groupBy({
          by: ['type'],
          where: { userId },
          _count: {
            id: true,
          },
        }),
      ]);

      return {
        total,
        unread,
        read: total - unread,
        byType: byType.reduce((acc, item) => {
          acc[item.type] = item._count.id;
          return acc;
        }, {} as Record<string, number>),
      };
    } catch (error) {
      console.error('Error getting notification stats:', error);
      throw error;
    }
  }
}

export const notificationService = new NotificationService(); 