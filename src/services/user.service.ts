import { User, Address } from '@prisma/client';
import prisma from '../lib/prisma';
import { ApiError } from '../middlewares/error.middleware';
import bcrypt from 'bcryptjs';

// Types
interface UpdateUserInput {
  fullName?: string;
  phone?: string;
  isActive?: boolean;
}

interface CreateAddressInput {
  userId: string;
  label: string;
  street: string;
  city: string;
  state: string;
  postalCode?: string;
  country?: string;
  landmark?: string;
  instructions?: string;
  location: { lat: number; lng: number };
  isDefault?: boolean;
}

interface UpdateAddressInput extends Partial<CreateAddressInput> {
  id: string;
  userId: string; // For authorization check
}

export class UserService {
  // Get user by ID
  async getUserById(id: string): Promise<User> {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        addresses: true
      }
    });
    if (!user) {
      throw new ApiError(404, 'User not found');
    }
    
    const formattedUser = {
      ...user,
      addresses: user?.addresses.map((address) =>{
        return {
          id: address.id,
          city: address.city,
          state: address.state,
          street: address.street,
          label: address.label
        }
      })
    }
    return formattedUser;
  }

  // Update user profile
  async updateUser(id: string, data: UpdateUserInput): Promise<User> {
    // Check if user exists
    await this.getUserById(id);

    // Check if phone is already in use by another user if phone is being updated
    if (data.phone) {
      const existingUser = await prisma.user.findFirst({
        where: {
          phone: data.phone,
          NOT: { id }
        }
      });

      if (existingUser) {
        throw new ApiError(409, 'Phone number is already in use');
      }
    }

    // Update user
    return prisma.user.update({
      where: { id },
      data
    });
  }

  // Change password
  async changePassword(id: string, currentPassword: string, newPassword: string): Promise<void> {
    // Get user
    const user = await this.getUserById(id);

    // Verify current password
    const isPasswordMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordMatch) {
      throw new ApiError(401, 'Current password is incorrect');
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    await prisma.user.update({
      where: { id },
      data: { password: hashedPassword }
    });
  }

  // Get user addresses
  async getUserAddresses(userId: string): Promise<Address[]> {
    return prisma.address.findMany({
      where: { userId }
    });
  }

  // Create user address
  async createAddress(data: CreateAddressInput): Promise<Address> {
    // If this is set as default, unset any existing default address
    if (data.isDefault) {
      await prisma.address.updateMany({
        where: { 
          userId: data.userId,
          isDefault: true 
        },
        data: { isDefault: false }
      });
    }

    // Create new address
    return prisma.address.create({
      data: {
        userId: data.userId,
        label: data.label,
        street: data.street,
        city: data.city,
        state: data.state,
        postalCode: data.postalCode,
        country: data.country || 'Rwanda',
        landmark: data.landmark,
        instructions: data.instructions,
        location: data.location,
        isDefault: data.isDefault || false
      }
    });
  }

  // Update user address
  async updateAddress(data: UpdateAddressInput): Promise<Address> {
    // Check if address exists and belongs to the user
    const address = await prisma.address.findUnique({
      where: { id: data.id }
    });

    if (!address) {
      throw new ApiError(404, 'Address not found');
    }

    if (address.userId !== data.userId) {
      throw new ApiError(403, 'Not authorized to update this address');
    }

    // If setting as default, unset any existing default address
    if (data.isDefault) {
      await prisma.address.updateMany({
        where: { 
          userId: data.userId,
          isDefault: true,
          NOT: { id: data.id }
        },
        data: { isDefault: false }
      });
    }

    // Update address
    return prisma.address.update({
      where: { id: data.id },
      data: {
        label: data.label,
        street: data.street,
        city: data.city,
        state: data.state,
        postalCode: data.postalCode,
        country: data.country,
        landmark: data.landmark,
        instructions: data.instructions,
        location: data.location,
        isDefault: data.isDefault
      }
    });
  }

  // Delete user address
  async deleteAddress(id: string, userId: string): Promise<void> {
    // Check if address exists and belongs to the user
    const address = await prisma.address.findUnique({
      where: { id }
    });

    if (!address) {
      throw new ApiError(404, 'Address not found');
    }

    if (address.userId !== userId) {
      throw new ApiError(403, 'Not authorized to delete this address');
    }

    // Delete address
    await prisma.address.delete({
      where: { id }
    });
  }
} 