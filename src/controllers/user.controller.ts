import { Request, Response } from 'express';
import { UserService } from '../services/user.service';
import { asyncHandler } from '../middlewares/error.middleware';

// Initialize service
const userService = new UserService();

// Get current user profile
export const getMyProfile = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  
  const user = await userService.getUserById(userId);
  
  // Remove sensitive data
  const { password, ...userWithoutPassword } = user;
  
  res.status(200).json({
    status: 'success',
    data: {
      user: userWithoutPassword
    }
  });
});

// Update current user profile
export const updateMyProfile = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { fullName, phone } = req.body;
  
  const updatedUser = await userService.updateUser(userId, {
    fullName,
    phone
  });
  
  // Remove sensitive data
  const { password, ...userWithoutPassword } = updatedUser;
  
  res.status(200).json({
    status: 'success',
    message: 'Profile updated successfully',
    data: {
      user: userWithoutPassword
    }
  });
});

// Change password
export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { currentPassword, newPassword } = req.body;
  
  await userService.changePassword(userId, currentPassword, newPassword);
  
  res.status(200).json({
    status: 'success',
    message: 'Password changed successfully'
  });
});

// Get user addresses
export const getMyAddresses = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  
  const addresses = await userService.getUserAddresses(userId);
  
  res.status(200).json({
    status: 'success',
    data: {
      addresses
    }
  });
});

// Create address
export const createAddress = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { label, street, city, state, postalCode, country, landmark, instructions, location, isDefault } = req.body;
  
  const address = await userService.createAddress({
    userId,
    label,
    street,
    city,
    state,
    postalCode,
    country,
    landmark,
    instructions,
    location,
    isDefault
  });
  
  res.status(201).json({
    status: 'success',
    message: 'Address created successfully',
    data: {
      address
    }
  });
});

// Update address
export const updateAddress = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const addressId = req.params.id;
  const { label, street, city, state, postalCode, country, landmark, instructions, location, isDefault } = req.body;
  
  const address = await userService.updateAddress({
    id: addressId,
    userId,
    label,
    street,
    city,
    state,
    postalCode,
    country,
    landmark,
    instructions,
    location,
    isDefault
  });
  
  res.status(200).json({
    status: 'success',
    message: 'Address updated successfully',
    data: {
      address
    }
  });
});

// Delete address
export const deleteAddress = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const addressId = req.params.id;
  
  await userService.deleteAddress(addressId, userId);
  
  res.status(200).json({
    status: 'success',
    message: 'Address deleted successfully'
  });
}); 