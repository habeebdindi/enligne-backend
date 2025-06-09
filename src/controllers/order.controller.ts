import { Request, Response } from 'express';
import { OrderService } from '../services/order.service';


export class OrderController {
    private orderService: OrderService;

    constructor() {
        this.orderService = new OrderService();
    }

  addToCart = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const { productId, quantity, notes } = req.body;
      if (!userId || !productId) {
        return res.status(400).json({ status: 'error', message: 'userId and productId are required' });
      }
      const cart = await this.orderService.addToCart(userId, productId, quantity, notes);
      res.json({ status: 'success', data: cart });
    } catch (error) {
      res.status(500).json({ status: 'error', message: 'Error adding to cart', error });
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
} 