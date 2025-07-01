import { Request, Response } from 'express';
import { OrderService } from '../services/order.service';


export class OrderController {
    private orderService = new OrderService();

    addToCart = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.id;
            const { productId, quantity, notes } = req.body;
  
            
            if (!userId || !productId) {
                return res.status(400).json({ status: 'error', message: 'userId and productId are required' });
            }
            
            const cart = await this.orderService.addToCart(userId, productId, quantity, notes);
            res.json({ status: 'success', data: cart });
        } catch (error: any) {
            console.error('Error in addToCart controller:', error);
            
            // More specific error handling
            if (error.message === 'Customer profile not found') {
                return res.status(400).json({ 
                    status: 'error', 
                    message: 'Customer profile not found. Please complete your profile setup.' 
                });
            }
            
            if (error.code === 'P2025') {
                return res.status(400).json({ 
                    status: 'error', 
                    message: 'Product not found or no longer available' 
                });
            }
            
            if (error.code === 'P2003') {
                return res.status(400).json({ 
                    status: 'error', 
                    message: 'Invalid product reference' 
                });
            }
            
            res.status(500).json({ 
                status: 'error', 
                message: 'Error adding to cart', 
                error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
                details: process.env.NODE_ENV === 'development' ? error : undefined
            });
        }
    };

    getCart = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.id;
            if (!userId) return res.status(400).json({ status: 'error', message: 'userId required' });
            const cart = await this.orderService.getCart(userId);
            res.json({ status: 'success', data: cart ? cart : [] });
        } catch (error) {
            res.status(500).json({ status: 'error', message: 'Error fetching cart', error });
        }
    };

    updateCartItem = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.id;
            const { id } = req.params;
            const { quantity, notes } = req.body;
            if (!userId || !id || typeof quantity !== 'number') {
                return res.status(400).json({ status: 'error', message: 'userId, id, and quantity are required' });
            }
            const item = await this.orderService.updateCartItem(userId, id, quantity, notes);
            res.json({ status: 'success', data: item });
        } catch (error) {
            res.status(500).json({ status: 'error', message: 'Error updating cart item', error });
        }
    };

    removeCartItem = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.id;
            const { id } = req.params;
            if (!userId || !id) {
                return res.status(400).json({ status: 'error', message: 'userId and id are required' });
            }
            await this.orderService.removeCartItem(userId, id);
            res.json({ status: 'success', message: 'Item removed from cart' });
        } catch (error) {
            res.status(500).json({ status: 'error', message: 'Error removing cart item', error });
        }
    };

    clearCart = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.id;
            if (!userId) return res.status(400).json({ status: 'error', message: 'userId required' });
            await this.orderService.clearCart(userId);
            res.json({ status: 'success', message: 'Cart cleared' });
        } catch (error) {
            res.status(500).json({ status: 'error', message: 'Error clearing cart', error });
        }
    };

    // Create a new order from cart
    createOrder = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.id;
            const { addressId, paymentMethod, notes, scheduledFor, deliveryFee } = req.body;

            if (!userId) {
                return res.status(401).json({ 
                    status: 'error', 
                    message: 'User not authenticated' 
                });
            }

            if (!addressId || !paymentMethod) {
                return res.status(400).json({ 
                    status: 'error', 
                    message: 'Address ID and payment method are required' 
                });
            }

            if (!deliveryFee) {
                return res.status(400).json({ 
                    status: 'error', 
                    message: 'Delivery fee is required' 
                });
            }
            
            // Validate payment method
            const validPaymentMethods = ['CARD', 'CASH', 'MOMO_PAY'];
            if (!validPaymentMethods.includes(paymentMethod)) {
                return res.status(400).json({ 
                    status: 'error', 
                    message: 'Invalid payment method. Must be one of: CARD, CASH, MOMO_PAY' 
                });
            }

            const result = await this.orderService.createOrder(userId, {
                addressId,
                paymentMethod: paymentMethod as 'CARD' | 'CASH' | 'MOMO_PAY',
                notes,
                scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
                deliveryFee: deliveryFee!
            });

            // Check if we created multiple orders (multiple merchants)
            if ('orders' in result) {
                res.status(201).json({ 
                    status: 'success', 
                    message: `${result.orders.length} orders created successfully from ${result.orders.length} different merchants`,
                    data: { 
                        orders: result.orders,
                        summary: result.summary
                    } 
                });
            } else {
                // Single order (single merchant)
                res.status(201).json({ 
                    status: 'success', 
                    message: 'Order created successfully',
                    data: { order: result } 
                });
            }
        } catch (error: any) {
            console.error('Error creating order:', error);
            
            // Handle specific error cases
            if (error.message === 'Cart is empty') {
                return res.status(400).json({ 
                    status: 'error', 
                    message: 'Cannot create order: Cart is empty' 
                });
            }
            
            if (error.message === 'Address not found or does not belong to user') {
                return res.status(400).json({ 
                    status: 'error', 
                    message: 'Invalid delivery address' 
                });
            }

            res.status(500).json({ 
                status: 'error', 
                message: error.message || 'Error creating order', 
                error 
            });
        }
    };

    // Get all orders for the user
    getOrders = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.id;
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;

            if (!userId) {
                return res.status(401).json({ 
                    status: 'error', 
                    message: 'User not authenticated' 
                });
            }

            if (page < 1 || limit < 1 || limit > 50) {
                return res.status(400).json({ 
                    status: 'error', 
                    message: 'Invalid pagination parameters' 
                });
            }

            const result = await this.orderService.getOrders(userId, page, limit);

            res.json({ 
                status: 'success', 
                data: result 
            });
        } catch (error: any) {
            console.error('Error fetching orders:', error);
            res.status(500).json({ 
                status: 'error', 
                message: error.message || 'Error fetching orders', 
                error 
            });
        }
    };

    // Get order by ID
    getOrderById = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.id;
            const { id: orderId } = req.params;

            if (!userId) {
                return res.status(401).json({ 
                    status: 'error', 
                    message: 'User not authenticated' 
                });
            }

            if (!orderId) {
                return res.status(400).json({ 
                    status: 'error', 
                    message: 'Order ID is required' 
                });
            }

            const order = await this.orderService.getOrderById(userId, orderId);

            res.json({ 
                status: 'success', 
                data: { order } 
            });
        } catch (error: any) {
            if (error.message === 'Order not found') {
                return res.status(404).json({ 
                    status: 'error', 
                    message: 'Order not found' 
                });
            }

            console.error('Error fetching order:', error);
            res.status(500).json({ 
                status: 'error', 
                message: error.message || 'Error fetching order', 
                error 
            });
        }
    };
} 