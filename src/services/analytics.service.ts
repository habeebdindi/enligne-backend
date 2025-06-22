import prisma from '../lib/prisma';
import { ApiError } from '../middlewares/error.middleware';

// Types for analytics
export type TimeFilter = 'today' | '7days' | '30days' | '3months';

interface KeyMetrics {
  revenue: {
    amount: number;
    growth: number;
  };
  orders: {
    count: number;
    growth: number;
  };
  customers: {
    count: number;
    growth: number;
  };
  averageOrderValue: {
    amount: number;
    growth: number;
  };
}

interface RevenueTrendPoint {
  date: string;
  revenue: number;
  orders: number;
}

interface PerformanceMetrics {
  customerRetention: number;
  averagePreparationTime: number;
  customerRating: number;
  orderCompletionRate: number;
}

interface TopSellingItem {
  id: string;
  name: string;
  image: string;
  totalOrders: number;
  totalSales: number;
}

interface CustomerInsights {
  peakOrderHours: string;
  mostPopularOrderDay: string;
  repeatCustomersPercentage: number;
  deliverySuccessRate: number;
}

interface AnalyticsData {
  keyMetrics: KeyMetrics;
  revenueTrend: RevenueTrendPoint[];
  performanceMetrics: PerformanceMetrics;
  topSellingItems: TopSellingItem[];
  customerInsights: CustomerInsights;
}

export class AnalyticsService {
  private getDateRange(filter: TimeFilter): { startDate: Date; endDate: Date; previousStartDate: Date; previousEndDate: Date } {
    const now = new Date();
    const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    
    let startDate: Date;
    let previousStartDate: Date;
    let previousEndDate: Date;
    
    switch (filter) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        previousStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
        previousEndDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
        break;
      case '7days':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0, 0);
        previousStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 13, 0, 0, 0, 0);
        previousEndDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7, 23, 59, 59, 999);
        break;
      case '30days':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29, 0, 0, 0, 0);
        previousStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 59, 0, 0, 0, 0);
        previousEndDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30, 23, 59, 59, 999);
        break;
      case '3months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1, 0, 0, 0, 0);
        previousStartDate = new Date(now.getFullYear(), now.getMonth() - 5, 1, 0, 0, 0, 0);
        previousEndDate = new Date(now.getFullYear(), now.getMonth() - 3, 0, 23, 59, 59, 999);
        break;
      default:
        throw new ApiError(400, 'Invalid time filter');
    }
    
    return { startDate, endDate, previousStartDate, previousEndDate };
  }

  private calculateGrowth(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }

  async getAnalytics(userId: string, filter: TimeFilter): Promise<AnalyticsData> {
    // Get merchant
    const merchant = await prisma.merchant.findUnique({
      where: { userId },
      select: { id: true }
    });

    if (!merchant) {
      throw new ApiError(404, 'Merchant not found');
    }

    const { startDate, endDate, previousStartDate, previousEndDate } = this.getDateRange(filter);

    // Get current period data
    const currentPeriodData = await this.getPeriodData(merchant.id, startDate, endDate);
    
    // Get previous period data for comparison
    const previousPeriodData = await this.getPeriodData(merchant.id, previousStartDate, previousEndDate);

    // Calculate key metrics
    const keyMetrics = this.calculateKeyMetrics(currentPeriodData, previousPeriodData);

    // Get revenue trend
    const revenueTrend = await this.getRevenueTrend(merchant.id, startDate, endDate, filter);

    // Get performance metrics (not based on filters)
    const performanceMetrics = await this.getPerformanceMetrics(merchant.id);

    // Get top selling items
    const topSellingItems = await this.getTopSellingItems(merchant.id, startDate, endDate);

    // Get customer insights
    const customerInsights = await this.getCustomerInsights(merchant.id, startDate, endDate);

    return {
      keyMetrics,
      revenueTrend,
      performanceMetrics,
      topSellingItems,
      customerInsights
    };
  }

  private async getPeriodData(merchantId: string, startDate: Date, endDate: Date) {
    // Get orders and revenue
    const ordersData = await prisma.order.aggregate({
      where: {
        merchantId,
        createdAt: { gte: startDate, lte: endDate },
        status: { notIn: ['CANCELLED', 'REFUNDED'] }
      },
      _count: { id: true },
      _sum: { total: true }
    });

    // Get unique customers
    const uniqueCustomers = await prisma.order.groupBy({
      by: ['customerId'],
      where: {
        merchantId,
        createdAt: { gte: startDate, lte: endDate },
        status: { notIn: ['CANCELLED', 'REFUNDED'] }
      }
    });

    return {
      revenue: Number(ordersData._sum.total || 0),
      orders: ordersData._count.id,
      customers: uniqueCustomers.length,
      averageOrderValue: ordersData._count.id > 0 ? Number(ordersData._sum.total || 0) / ordersData._count.id : 0
    };
  }

  private calculateKeyMetrics(current: any, previous: any): KeyMetrics {
    return {
      revenue: {
        amount: current.revenue,
        growth: this.calculateGrowth(current.revenue, previous.revenue)
      },
      orders: {
        count: current.orders,
        growth: this.calculateGrowth(current.orders, previous.orders)
      },
      customers: {
        count: current.customers,
        growth: this.calculateGrowth(current.customers, previous.customers)
      },
      averageOrderValue: {
        amount: current.averageOrderValue,
        growth: this.calculateGrowth(current.averageOrderValue, previous.averageOrderValue)
      }
    };
  }

  private async getRevenueTrend(merchantId: string, startDate: Date, endDate: Date, filter: TimeFilter): Promise<RevenueTrendPoint[]> {
    let trendData: Array<{ date: string; revenue: number; orders: number }>;

    switch (filter) {
      case 'today':
        // Hourly data for today
        trendData = await prisma.$queryRaw<Array<{ date: string; revenue: number; orders: number }>>`
          SELECT 
            TO_CHAR("createdAt", 'HH24:00') as date,
            COALESCE(SUM("total"), 0) as revenue,
            COUNT(*) as orders
          FROM "Order"
          WHERE "merchantId" = ${merchantId}
            AND "createdAt" >= ${startDate}
            AND "createdAt" <= ${endDate}
            AND "status" NOT IN ('CANCELLED', 'REFUNDED')
          GROUP BY TO_CHAR("createdAt", 'HH24:00')
          ORDER BY TO_CHAR("createdAt", 'HH24:00')
        `;
        break;

      case '7days':
      case '30days':
        // Daily data for 7 days and 30 days
        trendData = await prisma.$queryRaw<Array<{ date: string; revenue: number; orders: number }>>`
          SELECT 
            TO_CHAR("createdAt", 'Mon DD') as date,
            COALESCE(SUM("total"), 0) as revenue,
            COUNT(*) as orders
          FROM "Order"
          WHERE "merchantId" = ${merchantId}
            AND "createdAt" >= ${startDate}
            AND "createdAt" <= ${endDate}
            AND "status" NOT IN ('CANCELLED', 'REFUNDED')
          GROUP BY TO_CHAR("createdAt", 'Mon DD')
          ORDER BY MIN("createdAt")
        `;
        break;

      case '3months':
        // Weekly data for 3 months
        trendData = await prisma.$queryRaw<Array<{ date: string; revenue: number; orders: number }>>`
          SELECT 
            TO_CHAR("createdAt", 'Mon DD') as date,
            COALESCE(SUM("total"), 0) as revenue,
            COUNT(*) as orders
          FROM "Order"
          WHERE "merchantId" = ${merchantId}
            AND "createdAt" >= ${startDate}
            AND "createdAt" <= ${endDate}
            AND "status" NOT IN ('CANCELLED', 'REFUNDED')
          GROUP BY TO_CHAR("createdAt", 'Mon DD')
          ORDER BY MIN("createdAt")
        `;
        break;

      default:
        throw new ApiError(400, 'Invalid time filter');
    }

    return trendData.map(item => ({
      date: item.date,
      revenue: Number(item.revenue),
      orders: Number(item.orders)
    }));
  }

  private async getPerformanceMetrics(merchantId: string): Promise<PerformanceMetrics> {
    // Customer retention calculation
    // Customers who ordered in the last 30 days and also ordered in the previous 30 days
    const now = new Date();
    const last30Days = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
    const previous30Days = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 60);

    const [currentCustomers, previousCustomers, repeatCustomers] = await Promise.all([
      // Current period customers
      prisma.order.groupBy({
        by: ['customerId'],
        where: {
          merchantId,
          createdAt: { gte: last30Days },
          status: { notIn: ['CANCELLED', 'REFUNDED'] }
        }
      }),
      // Previous period customers
      prisma.order.groupBy({
        by: ['customerId'],
        where: {
          merchantId,
          createdAt: { gte: previous30Days, lt: last30Days },
          status: { notIn: ['CANCELLED', 'REFUNDED'] }
        }
      }),
      // Repeat customers (ordered in both periods)
      prisma.$queryRaw<Array<{ customerId: string }>>`
        SELECT DISTINCT o1."customerId"
        FROM "Order" o1
        INNER JOIN "Order" o2 ON o1."customerId" = o2."customerId"
        WHERE o1."merchantId" = ${merchantId}
          AND o2."merchantId" = ${merchantId}
          AND o1."createdAt" >= ${last30Days}
          AND o2."createdAt" >= ${previous30Days} AND o2."createdAt" < ${last30Days}
          AND o1."status" NOT IN ('CANCELLED', 'REFUNDED')
          AND o2."status" NOT IN ('CANCELLED', 'REFUNDED')
      `
    ]);

    const customerRetention = previousCustomers.length > 0 
      ? (repeatCustomers.length / previousCustomers.length) * 100 
      : 0;

    // Average preparation time - using a fixed value for now

    const averagePreparationTime = 20; // Default value in minutes

    // Customer rating
    const ratingData = await prisma.review.aggregate({
      where: {
        merchantId,
        isPublished: true
      },
      _avg: {
        rating: true
      }
    });

    const customerRating = Number(ratingData._avg.rating || 0);

    // Order completion rate
    const [totalOrders, completedOrders] = await Promise.all([
      prisma.order.count({
        where: {
          merchantId,
          createdAt: { gte: last30Days }
        }
      }),
      prisma.order.count({
        where: {
          merchantId,
          status: 'DELIVERED',
          createdAt: { gte: last30Days }
        }
      })
    ]);

    const orderCompletionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;

    return {
      customerRetention: Math.round(customerRetention * 100) / 100,
      averagePreparationTime,
      customerRating: Math.round(customerRating * 10) / 10,
      orderCompletionRate: Math.round(orderCompletionRate * 100) / 100
    };
  }

  private async getTopSellingItems(merchantId: string, startDate: Date, endDate: Date): Promise<TopSellingItem[]> {
    const topItems = await prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        order: {
          merchantId,
          createdAt: { gte: startDate, lte: endDate },
          status: { notIn: ['CANCELLED', 'REFUNDED'] }
        }
      },
      _sum: {
        price: true
      },
      _count: {
        id: true
      },
      orderBy: {
        _sum: {
          price: 'desc'
        }
      },
      take: 10
    });

    // Get product details for top items
    const productIds = topItems.map(item => item.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        name: true,
        images: true
      }
    });

    const productMap = new Map(products.map(p => [p.id, p]));

    return topItems.map(item => {
      const product = productMap.get(item.productId);
      return {
        id: item.productId,
        name: product?.name || 'Unknown Product',
        image: product?.images[0] || '',
        totalOrders: item._count.id,
        totalSales: Number(item._sum.price || 0)
      };
    });
  }

  private async getCustomerInsights(merchantId: string, startDate: Date, endDate: Date): Promise<CustomerInsights> {
    // Peak order hours
    const hourlyData = await prisma.$queryRaw<Array<{ hour: number; count: number }>>`
      SELECT 
        EXTRACT(HOUR FROM "createdAt") as hour,
        COUNT(*) as count
      FROM "Order"
      WHERE "merchantId" = ${merchantId}
        AND "createdAt" >= ${startDate}
        AND "createdAt" <= ${endDate}
        AND "status" NOT IN ('CANCELLED', 'REFUNDED')
      GROUP BY EXTRACT(HOUR FROM "createdAt")
      ORDER BY count DESC
      LIMIT 1
    `;

    const peakHour = hourlyData[0]?.hour || 12;
    const peakOrderHours = `${peakHour.toString().padStart(2, '0')}:00`;

    // Most popular order day
    const dailyData = await prisma.$queryRaw<Array<{ day: string; count: number }>>`
      SELECT 
        TO_CHAR("createdAt", 'Day') as day,
        COUNT(*) as count
      FROM "Order"
      WHERE "merchantId" = ${merchantId}
        AND "createdAt" >= ${startDate}
        AND "createdAt" <= ${endDate}
        AND "status" NOT IN ('CANCELLED', 'REFUNDED')
      GROUP BY TO_CHAR("createdAt", 'Day')
      ORDER BY count DESC
      LIMIT 1
    `;

    const mostPopularOrderDay = dailyData[0]?.day?.trim() || 'Friday';

    // Repeat customers percentage
    const [totalCustomers, repeatCustomers] = await Promise.all([
      prisma.order.groupBy({
        by: ['customerId'],
        where: {
          merchantId,
          createdAt: { gte: startDate, lte: endDate },
          status: { notIn: ['CANCELLED', 'REFUNDED'] }
        }
      }),
      prisma.$queryRaw<Array<{ customerId: string }>>`
        SELECT "customerId"
        FROM "Order"
        WHERE "merchantId" = ${merchantId}
          AND "createdAt" >= ${startDate}
          AND "createdAt" <= ${endDate}
          AND "status" NOT IN ('CANCELLED', 'REFUNDED')
        GROUP BY "customerId"
        HAVING COUNT(*) > 1
      `
    ]);

    const repeatCustomersPercentage = totalCustomers.length > 0 
      ? (repeatCustomers.length / totalCustomers.length) * 100 
      : 0;

    // Delivery success rate
    const [totalDeliveries, successfulDeliveries] = await Promise.all([
      prisma.delivery.count({
        where: {
          order: {
            merchantId,
            createdAt: { gte: startDate, lte: endDate }
          }
        }
      }),
      prisma.delivery.count({
        where: {
          order: {
            merchantId,
            createdAt: { gte: startDate, lte: endDate }
          },
          status: 'DELIVERED'
        }
      })
    ]);

    const deliverySuccessRate = totalDeliveries > 0 
      ? (successfulDeliveries / totalDeliveries) * 100 
      : 0;

    return {
      peakOrderHours,
      mostPopularOrderDay,
      repeatCustomersPercentage: Math.round(repeatCustomersPercentage * 100) / 100,
      deliverySuccessRate: Math.round(deliverySuccessRate * 100) / 100
    };
  }
} 