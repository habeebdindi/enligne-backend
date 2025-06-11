import { Request, Response } from 'express';
import { notificationService } from '../services/notification.service';
import { asyncHandler } from '../middlewares/error.middleware';

// Get all notifications for the authenticated user
export const getAllNotifications = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  const type = req.query.type as string;
  const isRead = req.query.isRead === 'true' ? true : req.query.isRead === 'false' ? false : undefined;

  const result = await notificationService.getAllNotifications(userId, {
    page,
    limit,
    type,
    isRead
  });

  res.status(200).json({
    status: 'success',
    data: result
  });
});

// Get count of unread notifications
export const getUnreadCount = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  
  const unreadCount = await notificationService.getUnreadCount(userId);

  res.status(200).json({
    status: 'success',
    data: { unreadCount }
  });
});

// Get a specific notification by ID
export const getNotificationById = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const notificationId = req.params.id;

  const notification = await notificationService.getNotificationById(notificationId, userId);

  if (!notification) {
    return res.status(404).json({
      status: 'error',
      message: 'Notification not found'
    });
  }

  res.status(200).json({
    status: 'success',
    data: { notification }
  });
});

// Mark a specific notification as read
export const markAsRead = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const notificationId = req.params.id;

  const notification = await notificationService.markAsRead(notificationId, userId);

  if (!notification) {
    return res.status(404).json({
      status: 'error',
      message: 'Notification not found'
    });
  }

  res.status(200).json({
    status: 'success',
    message: 'Notification marked as read',
    data: { notification }
  });
});

// Mark all notifications as read
export const markAllAsRead = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const updatedCount = await notificationService.markAllAsRead(userId);

  res.status(200).json({
    status: 'success',
    message: `${updatedCount} notifications marked as read`,
    data: { updatedCount }
  });
});

// Delete a specific notification
export const deleteNotification = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const notificationId = req.params.id;

  const deleted = await notificationService.deleteNotification(notificationId, userId);

  if (!deleted) {
    return res.status(404).json({
      status: 'error',
      message: 'Notification not found'
    });
  }

  res.status(200).json({
    status: 'success',
    message: 'Notification deleted successfully'
  });
});

// Clear all notifications (delete all)
export const clearAllNotifications = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const deletedCount = await notificationService.clearAllNotifications(userId);

  res.status(200).json({
    status: 'success',
    message: `${deletedCount} notifications cleared successfully`,
    data: { deletedCount }
  });
}); 