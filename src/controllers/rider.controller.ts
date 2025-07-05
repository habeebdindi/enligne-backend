import { Request, Response } from 'express';
import { RiderService } from '../services/rider.service';
import { asyncHandler } from '../middlewares/error.middleware';
import { DeliveryStatus } from '@prisma/client';

const riderService = new RiderService();

/**
 * Get rider dashboard (homepage) data
 */
export const getRiderDashboard = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const [riderProfile, availableOrders, currentDelivery, earnings] = await Promise.all([
    riderService.getRiderProfile(userId),
    riderService.getAvailableOrders(userId),
    riderService.getCurrentDelivery(userId),
    riderService.getEarnings(userId)
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      rider: riderProfile,
      availableOrders,
      currentDelivery,
      earnings
    }
  });
});

/**
 * Toggle rider availability status
 */
export const toggleAvailability = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { isAvailable, currentLocation } = req.body;

  const result = await riderService.toggleAvailability(userId, isAvailable, currentLocation);

  res.status(200).json({
    status: 'success',
    message: `Rider is now ${isAvailable ? 'online' : 'offline'}`,
    data: result
  });
});

/**
 * Get available orders for pickup
 */
export const getAvailableOrders = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const limit = parseInt(req.query.limit as string) || 20;

  const orders = await riderService.getAvailableOrders(userId, limit);

  res.status(200).json({
    status: 'success',
    data: orders
  });
});

/**
 * Accept an order for delivery
 */
export const acceptOrder = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { orderId } = req.params;

  const result = await riderService.acceptOrder(userId, orderId);

  res.status(200).json({
    status: 'success',
    message: result.message,
    data: result.order
  });
});

/**
 * Update delivery status
 */
export const updateDeliveryStatus = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { deliveryId } = req.params;
  const { status, location } = req.body;

  const updatedDelivery = await riderService.updateDeliveryStatus(userId, deliveryId, status, location);

  res.status(200).json({
    status: 'success',
    message: `Delivery status updated to ${status}`,
    data: updatedDelivery
  });
});

/**
 * Get rider earnings
 */
export const getEarnings = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const earnings = await riderService.getEarnings(userId);

  res.status(200).json({
    status: 'success',
    data: earnings
  });
});

/**
 * Get delivery history
 */
export const getDeliveryHistory = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;

  const history = await riderService.getDeliveryHistory(userId, page, limit);

  res.status(200).json({
    status: 'success',
    data: history
  });
});

/**
 * Get rider profile
 */
export const getRiderProfile = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const profile = await riderService.getRiderProfile(userId);

  res.status(200).json({
    status: 'success',
    data: profile
  });
});

/**
 * Update rider profile
 */
export const updateRiderProfile = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { vehicleType, vehicleNumber, identityDoc, currentLocation } = req.body;

  const updatedProfile = await riderService.updateProfile(userId, {
    vehicleType,
    vehicleNumber,
    identityDoc,
    currentLocation
  });

  res.status(200).json({
    status: 'success',
    message: 'Profile updated successfully',
    data: updatedProfile
  });
});

/**
 * Get current active delivery
 */
export const getCurrentDelivery = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const currentDelivery = await riderService.getCurrentDelivery(userId);

  res.status(200).json({
    status: 'success',
    data: currentDelivery
  });
}); 