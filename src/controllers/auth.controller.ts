import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { asyncHandler } from '../middlewares/error.middleware';

// Initialize services
const authService = new AuthService();

// Controller methods
export const register = asyncHandler(async (req: Request, res: Response) => {
  const { email, phone, password, fullName, address, role } = req.body;
  
  // Register user and get tokens
  const tokens = await authService.register({
    email,
    phone,
    password,
    fullName,
    address,
    role
  });

  // Return success response
  res.status(201).json({
    status: 'success',
    message: 'User registered successfully',
    data: {
      tokens
    }
  });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  
  // Login user and get tokens
  const tokens = await authService.login({ email, password });

  // Return success response
  res.status(200).json({
    status: 'success',
    message: 'User logged in successfully',
    data: {
      tokens
    }
  });
});

export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  
  // Generate new token pair
  const tokens = await authService.refreshToken(refreshToken);

  // Return success response
  res.status(200).json({
    status: 'success',
    message: 'Tokens refreshed successfully',
    data: {
      tokens
    }
  });
}); 