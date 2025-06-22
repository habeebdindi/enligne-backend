import { Request, Response } from 'express';
import { MerchantService } from '../services/merchant.service';
import { asyncHandler } from '../middlewares/error.middleware';

// Initialize service
const merchantService = new MerchantService();

// Get merchant dashboard data
export const getDashboard = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  
  const dashboardData = await merchantService.getDashboardData(userId);
  
  res.status(200).json({
    status: 'success',
    data: dashboardData
  });
});

// Get merchant profile
export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  
  const merchant = await merchantService.getMerchantProfile(userId);
  
  res.status(200).json({
    status: 'success',
    data: {
      merchant
    }
  });
});

// Update merchant profile
export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { 
    businessName, 
    description, 
    logo, 
    coverImage, 
    address, 
    businessPhone, 
    businessEmail 
  } = req.body;
  
  const updatedMerchant = await merchantService.updateMerchantProfile(userId, {
    businessName,
    description,
    logo,
    coverImage,
    address,
    businessPhone,
    businessEmail
  });
  
  res.status(200).json({
    status: 'success',
    message: 'Profile updated successfully',
    data: {
      merchant: updatedMerchant
    }
  });
});

// Update online status
export const updateOnlineStatus = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { isActive } = req.body;
  
  // Get merchant to get the merchant ID
  const merchant = await merchantService.getMerchantProfile(userId);
  
  const updatedMerchant = await merchantService.updateOnlineStatus({
    merchantId: merchant.id,
    isActive
  });
  
  res.status(200).json({
    status: 'success',
    message: `Merchant ${isActive ? 'activated' : 'deactivated'} successfully`,
    data: {
      merchant: {
        id: updatedMerchant.id,
        isActive: updatedMerchant.isActive
      }
    }
  });
});

// Get recent orders
export const getRecentOrders = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  
  const recentOrders = await merchantService.getRecentOrders(userId);
  
  res.status(200).json({
    status: 'success',
    data: {
      orders: recentOrders
    }
  });
});

// Get products summary
export const getProductsSummary = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  
  const summary = await merchantService.getProductsSummary(userId);
  
  res.status(200).json({
    status: 'success',
    data: summary
  });
});

// Get all products
export const getProducts = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { subcategory } = req.query;
  
  const products = await merchantService.getProducts(userId, subcategory as string);
  
  res.status(200).json({
    status: 'success',
    data: {
      products
    }
  });
});

// Get product subcategories
export const getProductSubcategories = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  
  const subcategories = await merchantService.getProductSubcategories(userId);
  
  res.status(200).json({
    status: 'success',
    data: {
      subcategories
    }
  });
});

// Create a new product
export const createProduct = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { 
    name, 
    price, 
    categoryId, 
    description, 
    images, 
    preparationTime, 
    stockQuantity, 
    subcategory 
  } = req.body;
  
  const product = await merchantService.createProduct(userId, {
    name,
    price,
    categoryId,
    description,
    images,
    preparationTime,
    stockQuantity,
    subcategory
  });
  
  res.status(201).json({
    status: 'success',
    message: 'Product created successfully',
    data: {
      product
    }
  });
});

// Update a product
export const updateProduct = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const productId = req.params.id;
  const { 
    name, 
    price, 
    categoryId, 
    description, 
    images, 
    preparationTime, 
    stockQuantity, 
    subcategory,
    isAvailable
  } = req.body;
  
  const product = await merchantService.updateProduct(userId, productId, {
    name,
    price,
    categoryId,
    description,
    images,
    preparationTime,
    stockQuantity,
    subcategory,
    isAvailable
  });
  
  res.status(200).json({
    status: 'success',
    message: 'Product updated successfully',
    data: {
      product
    }
  });
});

// Update product availability
export const updateProductAvailability = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const productId = req.params.id;
  const { isAvailable } = req.body;
  
  const product = await merchantService.updateProductAvailability(userId, productId, isAvailable);
  
  res.status(200).json({
    status: 'success',
    message: `Product ${isAvailable ? 'activated' : 'deactivated'} successfully`,
    data: {
      product
    }
  });
});

// Delete a product
export const deleteProduct = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const productId = req.params.id;
  
  await merchantService.deleteProduct(userId, productId);
  
  res.status(200).json({
    status: 'success',
    message: 'Product deleted successfully'
  });
});

// Get all orders for merchant
export const getOrders = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { status } = req.query;
  
  const orders = await merchantService.getOrders(userId, status as string);
  
  res.status(200).json({
    status: 'success',
    data: {
      orders
    }
  });
});

// Get order details
export const getOrderDetails = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const orderId = req.params.id;
  
  const orderDetails = await merchantService.getOrderDetails(userId, orderId);
  
  res.status(200).json({
    status: 'success',
    data: {
      order: orderDetails
    }
  });
});

// Update order status
export const updateOrderStatus = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const orderId = req.params.id;
  const { status } = req.body;
  
  const updatedOrder = await merchantService.updateOrderStatus(userId, orderId, status);
  
  res.status(200).json({
    status: 'success',
    message: `Order status updated to ${status}`,
    data: {
      order: updatedOrder
    }
  });
}); 