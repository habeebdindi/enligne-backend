import { Request, Response } from 'express';
import { ProductService } from '../services/product.service';

export class ProductController {
  private productService: ProductService;

  constructor() {
    this.productService = new ProductService();
  }

  getProductDetails = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const product = await this.productService.getProductDetails(id, userId);
      if (!product) {
        return res.status(404).json({ status: 'error', message: 'Product not found' });
      }
      res.json({ status: 'success', data: product });
    } catch (error) {
      res.status(500).json({ status: 'error', message: 'Error fetching product details', error });
    }
  };
} 