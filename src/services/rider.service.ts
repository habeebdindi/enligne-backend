import prisma from '../lib/prisma';
import { ApiError } from '../middlewares/error.middleware';
import { NotificationHelperService } from './notification-helper.service';
import { OrderStatus, DeliveryStatus } from '@prisma/client';

const notificationHelper = new NotificationHelperService();

export interface RiderStats {
  totalEarnings: number;
  totalDeliveries: number;
  totalHours: number;
  averageRating: number;
  completionRate: number;
}

export interface EarningsData {
  today: {
    earnings: number;
    hours: number;
    deliveries: number;
  };
  week: {
    earnings: number;
    hours: number;
    deliveries: number;
  };
  month: {
    earnings: number;
    hours: number;
    deliveries: number;
  };
}

export interface AvailableOrder {
  id: string;
  orderNumber: string;
  merchant: {
    id: string;
    businessName: string;
    address: string;
    location: any;
    businessPhone: string;
  };
  customer: {
    name: string;
    phone: string;
  };
  deliveryAddress: {
    street: string;
    city: string;
    state: string;
    location: any;
    instructions?: string;
  };
  items: {
    name: string;
    quantity: number;
  }[];
  total: number;
  deliveryFee: number;
  distance: number;
  estimatedTime: number;
  createdAt: Date;
}

export interface RiderProfile {
  id: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    phone: string;
  };
  isAvailable: boolean;
  currentLocation: any;
  vehicleType: string;
  vehicleNumber: string;
  identityDoc: string;
  rating: number;
  stats: RiderStats;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeliveryHistory {
  id: string;
  orderNumber: string;
  merchant: {
    businessName: string;
    address: string;
  };
  customer: {
    name: string;
    address: string;
  };
  deliveryFee: number;
  distance: number;
  status: DeliveryStatus;
  startTime: Date;
  endTime: Date;
  duration: number; // in minutes
  createdAt: Date;
}

export class RiderService {
  
  /**
   * Get rider profile by user ID
   */
  async getRiderByUserId(userId: string) {
    const rider = await prisma.rider.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            createdAt: true,
            updatedAt: true
          }
        }
      }
    });

    if (!rider) {
      throw new ApiError(404, 'Rider profile not found');
    }

    return rider;
  }

  /**
   * Toggle rider availability status
   */
  async toggleAvailability(userId: string, isAvailable: boolean, currentLocation?: any) {
    const rider = await this.getRiderByUserId(userId);

    const updatedRider = await prisma.rider.update({
      where: { id: rider.id },
      data: {
        isAvailable,
        currentLocation: currentLocation || rider.currentLocation,
        updatedAt: new Date()
      },
      include: {
        user: {
          select: {
            fullName: true,
            email: true,
            phone: true
          }
        }
      }
    });

    return {
      id: updatedRider.id,
      isAvailable: updatedRider.isAvailable,
      currentLocation: updatedRider.currentLocation,
      user: updatedRider.user
    };
  }

  /**
   * Get available orders for pickup
   */
  async getAvailableOrders(userId: string, limit: number = 20): Promise<AvailableOrder[]> {
    const rider = await this.getRiderByUserId(userId);

    // Only show orders to available riders
    if (!rider.isAvailable) {
      return [];
    }

    const orders = await prisma.order.findMany({
      where: {
        status: OrderStatus.READY_FOR_PICKUP,
        delivery: {
          OR: [
            { riderId: null },
            { riderId: rider.id }
          ]
        }
      },
      include: {
        merchant: {
          select: {
            id: true,
            businessName: true,
            address: true,
            location: true,
            businessPhone: true
          }
        },
        customer: {
          include: {
            user: {
              select: {
                fullName: true,
                phone: true
              }
            }
          }
        },
        address: {
          select: {
            street: true,
            city: true,
            state: true,
            location: true,
            instructions: true
          }
        },
        items: {
          select: {
            name: true,
            quantity: true
          }
        },
        delivery: {
          select: {
            distance: true,
            pickupLocation: true,
            dropoffLocation: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      },
      take: limit
    });

    return orders.map(order => ({
      id: order.id,
      orderNumber: order.id.substring(0, 8).toUpperCase(),
      merchant: order.merchant,
      customer: {
        name: order.customer.user.fullName,
        phone: order.customer.user.phone
      },
      deliveryAddress: {
        ...order.address,
        instructions: order.address.instructions || undefined
      },
      items: order.items,
      total: Number(order.total),
      deliveryFee: Number(order.deliveryFee),
      distance: order.delivery?.distance || 0,
      estimatedTime: Math.ceil((order.delivery?.distance || 0) * 3), // 3 minutes per km estimate
      createdAt: order.createdAt
    }));
  }

  /**
   * Accept a delivery order
   */
  async acceptOrder(userId: string, orderId: string) {
    const rider = await this.getRiderByUserId(userId);

    if (!rider.isAvailable) {
      throw new ApiError(400, 'Rider is not available');
    }

    // Check if order is still available
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        delivery: true,
        merchant: {
          include: {
            user: {
              select: {
                fullName: true,
                phone: true
              }
            }
          }
        },
        customer: {
          include: {
            user: {
              select: {
                fullName: true,
                phone: true
              }
            }
          }
        }
      }
    });

    if (!order) {
      throw new ApiError(404, 'Order not found');
    }

    if (order.status !== OrderStatus.READY_FOR_PICKUP) {
      throw new ApiError(400, 'Order is not ready for pickup');
    }

    if (order.delivery?.riderId && order.delivery.riderId !== rider.id) {
      throw new ApiError(400, 'Order has already been assigned to another rider');
    }

    // Update delivery with rider assignment
    await prisma.delivery.update({
      where: { orderId },
      data: {
        riderId: rider.id,
        status: DeliveryStatus.ASSIGNED
      }
    });

    // Update order status
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.PICKED_UP
      }
    });

    // Send notifications
    await notificationHelper.handleDeliveryStatusChange(order.delivery!.id, 'PENDING', 'ASSIGNED');

    return {
      success: true,
      message: 'Order accepted successfully',
      order: {
        id: order.id,
        orderNumber: order.id.substring(0, 8).toUpperCase(),
        merchant: order.merchant,
        customer: {
          name: order.customer.user.fullName,
          phone: order.customer.user.phone
        }
      }
    };
  }

  /**
   * Update delivery status
   */
  async updateDeliveryStatus(userId: string, deliveryId: string, status: DeliveryStatus, location?: any) {
    const rider = await this.getRiderByUserId(userId);

    const delivery = await prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: {
        order: true
      }
    });

    if (!delivery) {
      throw new ApiError(404, 'Delivery not found');
    }

    if (delivery.riderId !== rider.id) {
      throw new ApiError(403, 'You are not assigned to this delivery');
    }

    const updateData: any = {
      status,
      updatedAt: new Date()
    };

    // Handle specific status updates
    if (status === DeliveryStatus.PICKED_UP) {
      updateData.startTime = new Date();
      
      // Update order status
      await prisma.order.update({
        where: { id: delivery.orderId },
        data: { status: OrderStatus.IN_TRANSIT }
      });
    }

    if (status === DeliveryStatus.DELIVERED) {
      updateData.endTime = new Date();
      
      // Update order status
      await prisma.order.update({
        where: { id: delivery.orderId },
        data: { status: OrderStatus.DELIVERED }
      });
    }

    const updatedDelivery = await prisma.delivery.update({
      where: { id: deliveryId },
      data: updateData
    });

    // Send notifications
    await notificationHelper.handleDeliveryStatusChange(
      deliveryId,
      delivery.status,
      status
    );

    return updatedDelivery;
  }

  /**
   * Get rider's earnings data
   */
  async getEarnings(userId: string): Promise<EarningsData> {
    const rider = await this.getRiderByUserId(userId);

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get today's earnings
    const todayDeliveries = await prisma.delivery.findMany({
      where: {
        riderId: rider.id,
        status: DeliveryStatus.DELIVERED,
        endTime: {
          gte: startOfToday
        }
      },
      include: {
        order: {
          select: {
            deliveryFee: true
          }
        }
      }
    });

    // Get week's earnings
    const weekDeliveries = await prisma.delivery.findMany({
      where: {
        riderId: rider.id,
        status: DeliveryStatus.DELIVERED,
        endTime: {
          gte: startOfWeek
        }
      },
      include: {
        order: {
          select: {
            deliveryFee: true
          }
        }
      }
    });

    // Get month's earnings
    const monthDeliveries = await prisma.delivery.findMany({
      where: {
        riderId: rider.id,
        status: DeliveryStatus.DELIVERED,
        endTime: {
          gte: startOfMonth
        }
      },
      include: {
        order: {
          select: {
            deliveryFee: true
          }
        }
      }
    });

    return {
      today: {
        earnings: this.calculateEarnings(todayDeliveries),
        hours: this.calculateHours(todayDeliveries),
        deliveries: todayDeliveries.length
      },
      week: {
        earnings: this.calculateEarnings(weekDeliveries),
        hours: this.calculateHours(weekDeliveries),
        deliveries: weekDeliveries.length
      },
      month: {
        earnings: this.calculateEarnings(monthDeliveries),
        hours: this.calculateHours(monthDeliveries),
        deliveries: monthDeliveries.length
      }
    };
  }

  /**
   * Get delivery history
   */
  async getDeliveryHistory(userId: string, page: number = 1, limit: number = 20): Promise<{
    deliveries: DeliveryHistory[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const rider = await this.getRiderByUserId(userId);

    const skip = (page - 1) * limit;

    const [deliveries, total] = await Promise.all([
      prisma.delivery.findMany({
        where: {
          riderId: rider.id,
          status: {
            in: [DeliveryStatus.DELIVERED, DeliveryStatus.FAILED, DeliveryStatus.CANCELLED]
          }
        },
        include: {
          order: {
            include: {
              merchant: {
                select: {
                  businessName: true,
                  address: true
                }
              },
              customer: {
                include: {
                  user: {
                    select: {
                      fullName: true
                    }
                  }
                }
              },
              address: {
                select: {
                  street: true,
                  city: true,
                  state: true
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.delivery.count({
        where: {
          riderId: rider.id,
          status: {
            in: [DeliveryStatus.DELIVERED, DeliveryStatus.FAILED, DeliveryStatus.CANCELLED]
          }
        }
      })
    ]);

    const deliveryHistory = deliveries.map(delivery => ({
      id: delivery.id,
      orderNumber: delivery.order.id.substring(0, 8).toUpperCase(),
      merchant: {
        businessName: delivery.order.merchant.businessName,
        address: delivery.order.merchant.address
      },
      customer: {
        name: delivery.order.customer.user.fullName,
        address: `${delivery.order.address.street}, ${delivery.order.address.city}, ${delivery.order.address.state}`
      },
      deliveryFee: Number(delivery.order.deliveryFee),
      distance: delivery.distance,
      status: delivery.status,
      startTime: delivery.startTime!,
      endTime: delivery.endTime!,
      duration: delivery.startTime && delivery.endTime 
        ? Math.ceil((delivery.endTime.getTime() - delivery.startTime.getTime()) / (1000 * 60))
        : 0,
      createdAt: delivery.createdAt
    }));

    return {
      deliveries: deliveryHistory,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get rider profile with stats
   */
  async getRiderProfile(userId: string): Promise<RiderProfile> {
    const rider = await this.getRiderByUserId(userId);

    // Calculate stats
    const stats = await this.calculateRiderStats(rider.id);

    return {
      id: rider.id,
      user: rider.user,
      isAvailable: rider.isAvailable,
      currentLocation: rider.currentLocation,
      vehicleType: rider.vehicleType,
      vehicleNumber: rider.vehicleNumber || '',
      identityDoc: rider.identityDoc || '',
      rating: rider.rating,
      stats,
      createdAt: rider.createdAt,
      updatedAt: rider.updatedAt
    };
  }

  /**
   * Update rider profile
   */
  async updateProfile(userId: string, updateData: {
    vehicleType?: string;
    vehicleNumber?: string;
    identityDoc?: string;
    currentLocation?: any;
  }) {
    const rider = await this.getRiderByUserId(userId);

    const updatedRider = await prisma.rider.update({
      where: { id: rider.id },
      data: {
        ...updateData,
        updatedAt: new Date()
      },
      include: {
        user: {
          select: {
            fullName: true,
            email: true,
            phone: true
          }
        }
      }
    });

    return updatedRider;
  }

  /**
   * Get current active delivery
   */
  async getCurrentDelivery(userId: string) {
    const rider = await this.getRiderByUserId(userId);

    const activeDelivery = await prisma.delivery.findFirst({
      where: {
        riderId: rider.id,
        status: {
          in: [DeliveryStatus.ASSIGNED, DeliveryStatus.PICKED_UP, DeliveryStatus.IN_TRANSIT]
        }
      },
      include: {
        order: {
          include: {
            merchant: {
              select: {
                businessName: true,
                address: true,
                businessPhone: true,
                location: true
              }
            },
            customer: {
              include: {
                user: {
                  select: {
                    fullName: true,
                    phone: true
                  }
                }
              }
            },
            address: {
              select: {
                street: true,
                city: true,
                state: true,
                location: true,
                instructions: true
              }
            },
            items: {
              select: {
                name: true,
                quantity: true
              }
            }
          }
        }
      }
    });

    if (!activeDelivery) {
      return null;
    }

    return {
      id: activeDelivery.id,
      orderNumber: activeDelivery.order.id.substring(0, 8).toUpperCase(),
      status: activeDelivery.status,
      merchant: activeDelivery.order.merchant,
      customer: {
        name: activeDelivery.order.customer.user.fullName,
        phone: activeDelivery.order.customer.user.phone
      },
      deliveryAddress: activeDelivery.order.address,
      items: activeDelivery.order.items,
      total: Number(activeDelivery.order.total),
      deliveryFee: Number(activeDelivery.order.deliveryFee),
      distance: activeDelivery.distance,
      trackingCode: activeDelivery.trackingCode,
      pickupLocation: activeDelivery.pickupLocation,
      dropoffLocation: activeDelivery.dropoffLocation,
      startTime: activeDelivery.startTime,
      createdAt: activeDelivery.createdAt
    };
  }

  /**
   * Private helper methods
   */
  private calculateEarnings(deliveries: any[]): number {
    return deliveries.reduce((total, delivery) => {
      // Riders typically get 70-80% of delivery fee
      const riderCommission = 0.75;
      return total + (Number(delivery.order.deliveryFee) * riderCommission);
    }, 0);
  }

  private calculateHours(deliveries: any[]): number {
    return deliveries.reduce((total, delivery) => {
      if (delivery.startTime && delivery.endTime) {
        const hours = (delivery.endTime.getTime() - delivery.startTime.getTime()) / (1000 * 60 * 60);
        return total + hours;
      }
      return total;
    }, 0);
  }

  private async calculateRiderStats(riderId: string): Promise<RiderStats> {
    const [totalDeliveries, completedDeliveries, totalEarnings, avgRating] = await Promise.all([
      prisma.delivery.count({
        where: { riderId }
      }),
      prisma.delivery.findMany({
        where: {
          riderId,
          status: DeliveryStatus.DELIVERED
        },
        include: {
          order: {
            select: {
              deliveryFee: true
            }
          }
        }
      }),
      prisma.delivery.findMany({
        where: {
          riderId,
          status: DeliveryStatus.DELIVERED,
          startTime: { not: null },
          endTime: { not: null }
        },
        select: {
          startTime: true,
          endTime: true,
          order: {
            select: {
              deliveryFee: true
            }
          }
        }
      }),
      prisma.rider.findUnique({
        where: { id: riderId },
        select: { rating: true }
      })
    ]);

    const totalHours = this.calculateHours(totalEarnings);
    const earnings = this.calculateEarnings(completedDeliveries);
    const completionRate = totalDeliveries > 0 ? (completedDeliveries.length / totalDeliveries) * 100 : 0;

    return {
      totalEarnings: earnings,
      totalDeliveries: completedDeliveries.length,
      totalHours,
      averageRating: avgRating?.rating || 0,
      completionRate
    };
  }
} 