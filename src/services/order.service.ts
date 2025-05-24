import prisma from '../lib/prisma';

export class OrderService {
  async addToCart(userId: string, productId: string, quantity: number = 1, notes?: string) {
    // Find the customer profile for the user
    const customer = await prisma.customer.findUnique({ where: { userId } });
    if (!customer) throw new Error('Customer profile not found');

    // Find or create the cart
    let cart = await prisma.cart.findUnique({ where: { customerId: customer.id } });
    if (!cart) {
      cart = await prisma.cart.create({ data: { customerId: customer.id } });
    }

    // Check if the product is already in the cart
    const existingItem = await prisma.cartItem.findFirst({
      where: { cartId: cart.id, productId },
    });

    let cartItem;
    if (existingItem) {
      // Update quantity
      cartItem = await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: existingItem.quantity + quantity, notes },
      });
    } else {
      // Add new item
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
    return updatedCart;
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
} 