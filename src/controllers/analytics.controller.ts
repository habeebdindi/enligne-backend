import { Request, Response } from 'express';
import { AnalyticsService, TimeFilter } from '../services/analytics.service';
import { asyncHandler } from '../middlewares/error.middleware';

// Initialize service
const analyticsService = new AnalyticsService();

// Get analytics data
export const getAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const filter = (req.query.filter as TimeFilter) || '7days';
  
  const analyticsData = await analyticsService.getAnalytics(userId, filter);
  
  res.status(200).json({
    status: 'success',
    data: analyticsData
  });
}); 