import { Merchant, Order, Review, Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { ApiError } from '../middlewares/error.middleware';

// Types
interface DashboardData {
  merchant: {
    id: string;
    businessName: string;
    rating: number;
    totalReviews: number;
    email: string;
    phone: string;
    address: string;
    isVerified: boolean;
    isActive: boolean;
  };
  metrics: {
    totalOrders: number;
    totalRevenue: number;
    pendingOrders: number;
    currentMonthRevenue: number;
    currentMonthOrders: number;
    revenueGrowth: number;
    ordersGrowth: number;
  };
  accountSetupProgress: {
    accountCreated: 'completed';
    businessVerification: 'completed' | 'pending';
    addProduct: 'completed' | 'pending';
    firstOrder: 'completed' | 'pending';
  };
}

interface RecentOrder {
  id: string;
  customerName: string;
  productName: string;
  status: string;
  createdAt: Date;
  total: number;
}

interface ProductSummary {
  totalProducts: number;
  availableProducts: number;
  unavailableProducts: number;
  grossSales: number;
}

interface MerchantProduct {
  id: string;
  name: string;
  price: number;
  monthlySales: number;
  description: string | null;
  isAvailable: boolean;
  totalSales: number;
  category: string;
  subcategory: string | null;
  images: string[];
}

interface CreateProductInput {
  name: string;
  price: number;
  categoryId: string;
  description?: string;
  images: string[];
  preparationTime?: number;
  stockQuantity?: number;
  subcategory?: string;
}

interface UpdateProductInput {
  name?: string;
  price?: number;
  categoryId?: string;
  description?: string;
  images?: string[];
  preparationTime?: number;
  stockQuantity?: number;
  subcategory?: string;
  isAvailable?: boolean;
}

interface ProductSubcategory {
  name: string;
  count: number;
}

interface UpdateOnlineStatusInput {
  merchantId: string;
  isActive: boolean;
}

type MerchantWithUser = Merchant & {
  user: {
    email: string;
    phone: string;
  };
};

export class MerchantService {
  // Get merchant by user ID
  async getMerchantByUserId(userId: string): Promise<MerchantWithUser> {
    const merchant = await prisma.merchant.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            email: true,
            phone: true
          }
        }
      }
    });

    if (!merchant) {
      throw new ApiError(404, 'Merchant profile not found');
    }

    return merchant as MerchantWithUser;
  }

  // Get merchant dashboard data
  async getDashboardData(userId: string): Promise<DashboardData> {
    // Get merchant profile
    const merchant = await this.getMerchantByUserId(userId);

    // Get current date for calculations
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    // Get total orders and revenue
    const totalOrdersData = await prisma.order.aggregate({
      where: {
        merchantId: merchant.id,
        status: {
          notIn: ['CANCELLED', 'REFUNDED']
        }
      },
      _count: {
        id: true
      },
      _sum: {
        total: true
      }
    });

    // Get pending orders count
    const pendingOrders = await prisma.order.count({
      where: {
        merchantId: merchant.id,
        status: {
          in: ['PENDING', 'CONFIRMED', 'PREPARING']
        }
      }
    });

    // Get current month orders and revenue
    const currentMonthData = await prisma.order.aggregate({
      where: {
        merchantId: merchant.id,
        createdAt: {
          gte: currentMonthStart
        },
        status: {
          notIn: ['CANCELLED', 'REFUNDED']
        }
      },
      _count: {
        id: true
      },
      _sum: {
        total: true
      }
    });

    // Get last month orders and revenue for comparison
    const lastMonthData = await prisma.order.aggregate({
      where: {
        merchantId: merchant.id,
        createdAt: {
          gte: lastMonthStart,
          lte: lastMonthEnd
        },
        status: {
          notIn: ['CANCELLED', 'REFUNDED']
        }
      },
      _count: {
        id: true
      },
      _sum: {
        total: true
      }
    });

    // Get total reviews count
    const totalReviews = await prisma.review.count({
      where: {
        merchantId: merchant.id,
        isPublished: true
      }
    });

    // Get products count for account setup progress
    const productsCount = await prisma.product.count({
      where: {
        merchantId: merchant.id,
        isAvailable: true
      }
    });

    // Calculate growth percentages
    const currentMonthRevenue = Number(currentMonthData._sum.total || 0);
    const lastMonthRevenue = Number(lastMonthData._sum.total || 0);
    const currentMonthOrders = currentMonthData._count.id;
    const lastMonthOrders = lastMonthData._count.id;

    const revenueGrowth = lastMonthRevenue > 0 
      ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 
      : 0;
    
    const ordersGrowth = lastMonthOrders > 0 
      ? ((currentMonthOrders - lastMonthOrders) / lastMonthOrders) * 100 
      : 0;

    // Determine account setup progress
    const accountSetupProgress = {
      accountCreated: 'completed' as const, // Always completed if merchant exists
      businessVerification: merchant.isVerified ? 'completed' as const : 'pending' as const,
      addProduct: productsCount > 0 ? 'completed' as const : 'pending' as const,
      firstOrder: totalOrdersData._count.id > 0 ? 'completed' as const : 'pending' as const
    };

    return {
      merchant: {
        id: merchant.id,
        businessName: merchant.businessName,
        rating: merchant.rating,
        totalReviews,
        email: merchant.user.email,
        phone: merchant.user.phone,
        address: merchant.address,
        isVerified: merchant.isVerified,
        isActive: merchant.isActive
      },
      metrics: {
        totalOrders: totalOrdersData._count.id,
        totalRevenue: Number(totalOrdersData._sum.total || 0),
        pendingOrders,
        currentMonthRevenue,
        currentMonthOrders,
        revenueGrowth: Math.round(revenueGrowth * 100) / 100, // Round to 2 decimal places
        ordersGrowth: Math.round(ordersGrowth * 100) / 100
      },
      accountSetupProgress
    };
  }

  // Update merchant online status
  async updateOnlineStatus(data: UpdateOnlineStatusInput): Promise<Merchant> {
    // Verify merchant exists
    const merchant = await prisma.merchant.findUnique({
      where: { id: data.merchantId }
    });

    if (!merchant) {
      throw new ApiError(404, 'Merchant not found');
    }

    // Update online status
    return prisma.merchant.update({
      where: { id: data.merchantId },
      data: { isActive: data.isActive }
    });
  }

  // Get merchant profile details
  async getMerchantProfile(userId: string): Promise<MerchantWithUser> {
    return this.getMerchantByUserId(userId);
  }

  // Update merchant profile
  async updateMerchantProfile(userId: string, data: Partial<Merchant>): Promise<Merchant> {
    // Get merchant to ensure it exists
    await this.getMerchantByUserId(userId);

    // Remove fields that shouldn't be updated directly and JSON fields that need special handling
    const { 
      id, 
      userId: _, 
      createdAt, 
      updatedAt, 
      location, 
      openingHours,
      ...updateData 
    } = data;

    return prisma.merchant.update({
      where: { userId },
      data: updateData as any // Type assertion to bypass complex Prisma types
    });
  }

  // Get recent orders for merchant
  async getRecentOrders(userId: string): Promise<RecentOrder[]> {
    // Get merchant to ensure it exists
    const merchant = await this.getMerchantByUserId(userId);

    // Get recent orders with customer and product details
    const recentOrders = await prisma.order.findMany({
      where: {
        merchantId: merchant.id
      },
      include: {
        customer: {
          include: {
            user: {
              select: {
                fullName: true
              }
            }
          }
        },
        items: {
          include: {
            product: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });

    // Transform the data to match the required format
    return recentOrders.map(order => ({
      id: order.id,
      customerName: order.customer.user.fullName,
      productName: order.items.length > 0 ? order.items[0].product.name : 'Multiple items',
      status: order.status,
      createdAt: order.createdAt,
      total: Number(order.total)
    }));
  }

  // Get products summary for merchant
  async getProductsSummary(userId: string): Promise<ProductSummary> {
    const merchant = await this.getMerchantByUserId(userId);

    // Get current month for sales calculation
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get total products count
    const totalProducts = await prisma.product.count({
      where: { merchantId: merchant.id }
    });

    // Get available products count
    const availableProducts = await prisma.product.count({
      where: { 
        merchantId: merchant.id,
        isAvailable: true
      }
    });

    // Get unavailable products count
    const unavailableProducts = await prisma.product.count({
      where: { 
        merchantId: merchant.id,
        isAvailable: false
      }
    });

    // Get gross sales from all orders
    const grossSalesData = await prisma.order.aggregate({
      where: {
        merchantId: merchant.id,
        status: {
          notIn: ['CANCELLED', 'REFUNDED']
        }
      },
      _sum: {
        total: true
      }
    });

    return {
      totalProducts,
      availableProducts,
      unavailableProducts,
      grossSales: Number(grossSalesData._sum.total || 0)
    };
  }

  // Get all products for merchant
  async getProducts(userId: string, subcategory?: string): Promise<MerchantProduct[]> {
    const merchant = await this.getMerchantByUserId(userId);

    // Get current month for sales calculation
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Build where clause
    const whereClause: any = { merchantId: merchant.id };

    if (subcategory) {
      whereClause.subcategory = subcategory;
    }

    // Get products with category
    const products = await prisma.product.findMany({
      where: whereClause,
      include: {
        category: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Get monthly sales for each product
    const productsWithSales = await Promise.all(
      products.map(async (product) => {
        // Get monthly sales count
        const monthlySales = await prisma.orderItem.count({
          where: {
            productId: product.id,
            order: {
              merchantId: merchant.id,
              createdAt: {
                gte: currentMonthStart
              },
              status: {
                notIn: ['CANCELLED', 'REFUNDED']
              }
            }
          }
        });

        // Get total sales amount for this product
        const totalSalesData = await prisma.orderItem.aggregate({
          where: {
            productId: product.id,
            order: {
              merchantId: merchant.id,
              status: {
                notIn: ['CANCELLED', 'REFUNDED']
              }
            }
          },
          _sum: {
            price: true
          }
        });

        return {
          id: product.id,
          name: product.name,
          price: Number(product.price),
          monthlySales,
          description: product.description,
          isAvailable: product.isAvailable,
          totalSales: Number(totalSalesData._sum.price || 0),
          category: product.category.name,
          subcategory: product.subcategory,
          images: product.images
        };
      })
    );

    return productsWithSales;
  }

  // Create a new product
  async createProduct(userId: string, data: CreateProductInput): Promise<any> {
    const merchant = await this.getMerchantByUserId(userId);

    // Validate category exists
    const category = await prisma.category.findUnique({
      where: { id: data.categoryId }
    });

    if (!category) {
      throw new ApiError(404, 'Category not found');
    }

    // Create the product
    const product = await prisma.product.create({
      data: {
        merchantId: merchant.id,
        name: data.name,
        price: data.price,
        description: data.description,
        images: data.images,
        categoryId: data.categoryId,
        preparationTime: data.preparationTime,
        stockQuantity: data.stockQuantity,
        subcategory: data.subcategory,
        isAvailable: true
      },
      include: {
        category: {
          select: {
            name: true
          }
        }
      }
    });

    return {
      id: product.id,
      name: product.name,
      price: Number(product.price),
      description: product.description,
      isAvailable: product.isAvailable,
      category: product.category.name,
      subcategory: product.subcategory,
      images: product.images
    };
  }

  // Update a product
  async updateProduct(userId: string, productId: string, data: UpdateProductInput): Promise<any> {
    const merchant = await this.getMerchantByUserId(userId);

    // Verify product belongs to merchant
    const existingProduct = await prisma.product.findFirst({
      where: {
        id: productId,
        merchantId: merchant.id
      }
    });

    if (!existingProduct) {
      throw new ApiError(404, 'Product not found');
    }

    // Validate category if being updated
    if (data.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: data.categoryId }
      });

      if (!category) {
        throw new ApiError(404, 'Category not found');
      }
    }

    // Prepare update data
    const updateData: any = {};
    
    if (data.name !== undefined) updateData.name = data.name;
    if (data.price !== undefined) updateData.price = data.price;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.images !== undefined) updateData.images = data.images;
    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
    if (data.preparationTime !== undefined) updateData.preparationTime = data.preparationTime;
    if (data.stockQuantity !== undefined) updateData.stockQuantity = data.stockQuantity;
    if (data.subcategory !== undefined) updateData.subcategory = data.subcategory;
    if (data.isAvailable !== undefined) updateData.isAvailable = data.isAvailable;

    // Update the product
    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: updateData,
      include: {
        category: {
          select: {
            name: true
          }
        }
      }
    });

    return {
      id: updatedProduct.id,
      name: updatedProduct.name,
      price: Number(updatedProduct.price),
      description: updatedProduct.description,
      isAvailable: updatedProduct.isAvailable,
      category: updatedProduct.category.name,
      subcategory: updatedProduct.subcategory,
      images: updatedProduct.images,
      preparationTime: updatedProduct.preparationTime,
      stockQuantity: updatedProduct.stockQuantity
    };
  }

  // Update product availability
  async updateProductAvailability(userId: string, productId: string, isAvailable: boolean): Promise<any> {
    const merchant = await this.getMerchantByUserId(userId);

    // Verify product belongs to merchant
    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        merchantId: merchant.id
      }
    });

    if (!product) {
      throw new ApiError(404, 'Product not found');
    }

    // Update availability
    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: { isAvailable },
      include: {
        category: {
          select: {
            name: true
          }
        }
      }
    });

    return {
      id: updatedProduct.id,
      name: updatedProduct.name,
      isAvailable: updatedProduct.isAvailable
    };
  }

  // Delete a product
  async deleteProduct(userId: string, productId: string): Promise<void> {
    const merchant = await this.getMerchantByUserId(userId);

    // Verify product belongs to merchant
    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        merchantId: merchant.id
      }
    });

    if (!product) {
      throw new ApiError(404, 'Product not found');
    }

    // Check if product has any orders
    const orderItems = await prisma.orderItem.findFirst({
      where: { productId }
    });

    if (orderItems) {
      throw new ApiError(400, 'Cannot delete product that has been ordered');
    }

    // Delete the product
    await prisma.product.delete({
      where: { id: productId }
    });
  }

  // Get subcategories for merchant
  async getProductSubcategories(userId: string): Promise<ProductSubcategory[]> {
    const merchant = await this.getMerchantByUserId(userId);

    // Build where clause
    const whereClause: any = { 
      merchantId: merchant.id,
      subcategory: {
        not: null
      }
    };

    // Get subcategories with count
    const subcategories = await prisma.product.groupBy({
      by: ['subcategory'],
      where: whereClause,
      _count: {
        subcategory: true
      }
    });

    return subcategories
      .filter(item => item.subcategory) // Filter out null values
      .map(item => ({
        name: item.subcategory!,
        count: item._count.subcategory
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }
} 