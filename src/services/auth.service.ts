import { User, Role } from '@prisma/client';
import prisma from '../lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ApiError } from '../middlewares/error.middleware';

// Types
interface RegisterUserInput {
  email: string;
  phone: string;
  password: string;
  fullName: string;
  address: string;
  role?: Role;
}

interface LoginInput {
  email: string;
  password: string;
}

interface TokenPayload {
  id: string;
  email: string;
  role: Role;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

// Service class
export class AuthService {
  // Hash password
  private async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  // Compare password
  private async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  // Generate JWT tokens
  private generateTokens(user: User): AuthTokens {
    const payload: TokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role
    };

    const accessToken = jwt.sign(
      payload,
      process.env.JWT_SECRET || 'default_jwt_secret',
      { expiresIn: process.env.JWT_EXPIRES_IN || '1d' } as jwt.SignOptions
    );

    const refreshToken = jwt.sign(
      payload,
      process.env.JWT_REFRESH_SECRET || 'default_jwt_refresh_secret',
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' } as jwt.SignOptions
    );

    return { accessToken, refreshToken };
  }

  // Register a new user
  async register(userData: RegisterUserInput): Promise<AuthTokens> {
    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: userData.email },
          { phone: userData.phone }
        ]
      }
    });

    if (existingUser) {
      throw new ApiError(409, 'User with this email or phone already exists');
    }

    // Hash password
    const hashedPassword = await this.hashPassword(userData.password);

    // Create new user
    const newUser = await prisma.user.create({
      data: {
        email: userData.email,
        phone: userData.phone,
        password: hashedPassword,
        fullName: userData.fullName,
        role: userData.role || Role.CUSTOMER,
      }
    });

    // If the user is a customer, create a customer profile
    if (newUser.role === Role.CUSTOMER) {
      await prisma.customer.create({
        data: {
          userId: newUser.id,
        }
      });
    }

    // Create default address for user
    await prisma.address.create({
      data: {
        userId: newUser.id,
        label: 'Home',
        street: userData.address,
        city: 'Kigali',
        state: 'Kigali',
        country: 'Rwanda',
        isDefault: true,
        location: { lat: 0, lng: 0 } // Default location
      }
    });

    // Generate tokens
    return this.generateTokens(newUser);
  }

  // Login user
  async login({ email, password }: LoginInput): Promise<AuthTokens> {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      throw new ApiError(401, 'Invalid credentials');
    }

    // Verify password
    const isPasswordMatch = await this.comparePassword(password, user.password);
    if (!isPasswordMatch) {
      throw new ApiError(401, 'Invalid credentials');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new ApiError(403, 'Your account has been deactivated');
    }

    // Generate tokens
    return this.generateTokens(user);
  }

  // Refresh token
  async refreshToken(token: string): Promise<AuthTokens> {
    try {
      // Verify refresh token
      const decoded = jwt.verify(
        token,
        process.env.JWT_REFRESH_SECRET || 'default_jwt_refresh_secret'
      ) as TokenPayload;

      // Find user
      const user = await prisma.user.findUnique({
        where: { id: decoded.id }
      });

      if (!user || !user.isActive) {
        throw new ApiError(401, 'Invalid token or inactive user');
      }

      // Generate new tokens
      return this.generateTokens(user);
    } catch (error) {
      throw new ApiError(401, 'Invalid or expired refresh token');
    }
  }

  // Verify token (for authentication middleware)
  verifyToken(token: string): TokenPayload {
    try {
      return jwt.verify(
        token, 
        process.env.JWT_SECRET || 'default_jwt_secret'
      ) as TokenPayload;
    } catch (error) {
      throw new ApiError(401, 'Invalid or expired token');
    }
  }
} 