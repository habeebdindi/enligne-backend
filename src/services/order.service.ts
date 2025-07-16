import prisma from '../lib/prisma';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { notificationHelper } from './notification-helper.service';
import { calculatePlatformFee } from '../utils/platform-fee.calculator';

type PaymentMethod = 'CARD' | 'CASH' | 'MOMO_PAY';

interface CreateOrderInput {
  addressId: string;
  paymentMethod: PaymentMethod;
  notes?: string;
  scheduledFor?: Date;
  deliveryFee?: number;
}

export class OrderService {
  async addToCart(userId: string, productId: string, quantity: number = 1, notes?: string) {
    try {
      // Find the customer profile for the user
      const customer = await prisma.customer.findUnique({ where: { userId } });
      if (!customer) throw new Error('Customer profile not found');

      // Verify the product exists
      const product = await prisma.product.findUnique({ where: { id: productId } });
      console.log('Product found:', product ? 'Yes' : 'No');
      
      if (!product) throw new Error('Product not found');
      if (!product.isAvailable) throw new Error('Product is not available');

      // Find or create the cart
      let cart = await prisma.cart.findUnique({ where: { customerId: customer.id } });
      console.log('Existing cart found:', cart ? 'Yes' : 'No');
      
      if (!cart) {
        console.log('Creating new cart for customer:', customer.id);
        cart = await prisma.cart.create({ data: { customerId: customer.id } });
      }

      // Check if the product is already in the cart
      const existingItem = await prisma.cartItem.findFirst({
        where: { cartId: cart.id, productId },
      });
      console.log('Existing cart item found:', existingItem ? 'Yes' : 'No');

      let cartItem;
      if (existingItem) {
        // Update quantity
        console.log('Updating existing cart item');
        cartItem = await prisma.cartItem.update({
          where: { id: existingItem.id },
          data: { quantity: existingItem.quantity + quantity, notes },
        });
      } else {
        // Add new item
        console.log('Creating new cart item');
        cartItem = await prisma.cartItem.create({
          data: { cartId: cart.id, productId, quantity, notes },
        });
      }

      // Return updated cart with items
      const updatedCart = await prisma.cart.findUnique({
        where: { id: cart.id },
        include: {
          items: {
            include: {
              product: true
            }
          }
        }
      });
      
      console.log('Cart operation completed successfully');
      return updatedCart;
    } catch (error) {
      console.error('Error in OrderService.addToCart:', error);
      throw error;
    }
  }

  async getCart(userId: string) {
    const customer = await prisma.customer.findUnique({ where: { userId } });
    if (!customer) throw new Error('Customer profile not found');
    const cart = await prisma.cart.findUnique({
      where: { customerId: customer.id },
      include: {
        items: {
          include: { product: true }
        }
      }
    });
    return cart;
  }

  async updateCartItem(userId: string, cartItemId: string, quantity: number, notes?: string) {
    const customer = await prisma.customer.findUnique({ where: { userId } });
    if (!customer) throw new Error('Customer profile not found');
    const cart = await prisma.cart.findUnique({ where: { customerId: customer.id } });
    if (!cart) throw new Error('Cart not found');
    const item = await prisma.cartItem.findUnique({ where: { id: cartItemId } });
    if (!item || item.cartId !== cart.id) throw new Error('Cart item not found');
    const updatedItem = await prisma.cartItem.update({
      where: { id: cartItemId },
      data: { quantity, notes }
    });
    return updatedItem;
  }

  async removeCartItem(userId: string, cartItemId: string) {
    const customer = await prisma.customer.findUnique({ where: { userId } });
    if (!customer) throw new Error('Customer profile not found');
    const cart = await prisma.cart.findUnique({ where: { customerId: customer.id } });
    if (!cart) throw new Error('Cart not found');
    const item = await prisma.cartItem.findUnique({ where: { id: cartItemId } });
    if (!item || item.cartId !== cart.id) throw new Error('Cart item not found');
    await prisma.cartItem.delete({ where: { id: cartItemId } });
    return { success: true };
  }

  async clearCart(userId: string) {
    const customer = await prisma.customer.findUnique({ where: { userId } });
    if (!customer) throw new Error('Customer profile not found');
    const cart = await prisma.cart.findUnique({ where: { customerId: customer.id } });
    if (!cart) throw new Error('Cart not found');
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    return { success: true };
  }

  async createOrder(userId: string, orderData: CreateOrderInput & { phoneNumber?: string }) {
    const { addressId, paymentMethod, notes, scheduledFor, phoneNumber, deliveryFee } = orderData;
    
    // Find the customer profile
    const customer = await prisma.customer.findUnique({ where: { userId } });
    if (!customer) throw new Error('Customer profile not found');

    // Get the user's cart
    const cart = await prisma.cart.findUnique({
      where: { customerId: customer.id },
      include: {
        items: {
          include: {
            product: {
              include: {
                merchant: {
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
            }
          }
        }
      }
    });

    if (!cart || cart.items.length === 0) {
      throw new Error('Cart is empty');
    }

    // Validate address belongs to user
    const address = await prisma.address.findFirst({
      where: { id: addressId, userId }
    });
    if (!address) {
      throw new Error('Address not found or does not belong to user');
    }

    // Group cart items by merchant
    const itemsByMerchant = cart.items.reduce((acc, item) => {
      const merchantId = item.product.merchantId;
      if (!acc[merchantId]) {
        acc[merchantId] = [];
      }
      acc[merchantId].push(item);
      return acc;
    }, {} as Record<string, typeof cart.items>);

    const createdOrders = [];

    // Create separate order for each merchant
    for (const [merchantId, items] of Object.entries(itemsByMerchant)) {
      // Calculate totals for this merchant's items
      const subtotal = items.reduce((total, item) => {
        return total + (Number(item.product.salePrice) || Number(item.product.price)) * item.quantity;
      }, 0);

      const platformFee = calculatePlatformFee(subtotal);
      const tax = subtotal * 0.00; // 0% VAT
      const total = subtotal + platformFee + tax - 0; // Include all fees in total

      // Create order for this merchant
      const order = await prisma.order.create({
        data: {
          customerId: customer.id,
          merchantId,
          addressId,
          subtotal,
          deliveryFee: deliveryFee!,
          platformFee,
          tax,
          total,
          paymentMethod,
          notes,
          scheduledFor,
          status: OrderStatus.PENDING,
          paymentStatus: PaymentStatus.PENDING,
          items: {
            create: items.map(item => ({
              productId: item.productId,
              name: item.product.name,
              price: Number(item.product.salePrice) || Number(item.product.price),
              quantity: item.quantity,
              notes: item.notes
            }))
          }
        },
        include: {
          items: {
            include: {
              product: true
            }
          },
          address: true,
          merchant: {
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

      // Use notification helper for order placed notification
      await notificationHelper.handleOrderPlaced(order.id);

      createdOrders.push(order);
    }

    // Clear the cart after successful order creation
    await prisma.cartItem.deleteMany({
      where: { cartId: cart.id }
    });

    // If only one merchant, return single order; otherwise return array
    return createdOrders.length === 1 ? createdOrders[0] : {
      orders: createdOrders,
      summary: {
        totalOrders: createdOrders.length,
        totalAmount: createdOrders.reduce((sum, order) => sum + Number(order.total), 0),
        merchants: createdOrders.map(order => order.merchant.user.fullName)
      }
    };
  }

  async getOrders(userId: string, page: number = 1, limit: number = 10) {
    const customer = await prisma.customer.findUnique({ where: { userId } });
    if (!customer) throw new Error('Customer profile not found');

    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: { customerId: customer.id },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  images: true
                }
              }
            }
          },
          address: true,
          merchant: {
            include: {
              user: {
                select: {
                  fullName: true
                }
              }
            }
          },
          delivery: true
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.order.count({
        where: { customerId: customer.id }
      })
    ]);

    return {
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getOrderById(userId: string, orderId: string) {
    const customer = await prisma.customer.findUnique({ where: { userId } });
    if (!customer) throw new Error('Customer profile not found');

    const order = await prisma.order.findFirst({
      where: { 
        id: orderId,
        customerId: customer.id 
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                description: true,
                images: true,
                price: true,
                salePrice: true
              }
            }
          }
        },
        address: true,
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
        delivery: {
          include: {
            rider: {
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
        }
      }
    });

    if (!order) {
      throw new Error('Order not found');
    }

    return order;
  }

  async updateOrderStatus(userId: string, orderId: string, status: OrderStatus) {
    const customer = await prisma.customer.findUnique({ where: { userId } });
    if (!customer) throw new Error('Customer profile not found');

    const order = await prisma.order.findFirst({
      where: { 
        id: orderId,
        customerId: customer.id 
      }
    });

    if (!order) {
      throw new Error('Order not found');
    }

    // Only allow certain status transitions for customers
    const allowedCustomerStatuses: OrderStatus[] = [OrderStatus.CANCELLED];
    if (!allowedCustomerStatuses.includes(status)) {
      throw new Error('Status update not allowed');
    }

    const oldStatus = order.status;

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { status },
      include: {
        items: true,
        address: true,
        merchant: {
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

    // Use notification helper for order status change
    await notificationHelper.handleOrderStatusChange(orderId, oldStatus, status);

    return updatedOrder;
  }
} 