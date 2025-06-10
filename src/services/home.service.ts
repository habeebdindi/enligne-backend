import prisma from '../lib/prisma';


interface SearchParams {
  query?: string;
  category?: string;
  location?: string;
  type?: 'merchant' | 'product' | 'category';
}

interface MerchantFilters {
  location?: string;
  category?: string;
  sort?: string;
  filter?: string;
}

export class HomeService {
  // Get available delivery locations
  async getLocations() {
    // Get unique cities and states from addresses
    const locations = await prisma.address.groupBy({
      by: ['city', 'state'],
      _count: {
        city: true,
      },
    });

    return locations.map(loc => ({
      city: loc.city,
      state: loc.state,
      count: loc._count.city,
    }));
  }

  // Get available categories
  async getCategories() {
    return prisma.category.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        icon: true,
        _count: {
          select: {
            merchants: true,
          },
        },
      },
    });
  }

  // Search for merchants, products, etc.
  async search({ query, category, location, type }: SearchParams) {
    // If no search criteria provided, return empty results instead of all merchants
    if (!query && !category && !location) {
      return [];
    }

    // If searching specifically for products, return products directly
    if (type === 'product') {
      return this.searchProducts({ query, category, location });
    }

    // If searching specifically for categories, return categories
    if (type === 'category') {
      return this.searchCategories({ query });
    }

    // Default: search for merchants
    return this.searchMerchants({ query, category, location });
  }

  // Search for products specifically
  private async searchProducts({ query, category, location }: { query?: string; category?: string; location?: string }) {
    const where: any = {
      isAvailable: true,
    };

    if (query && query.trim()) {
      where.OR = [
        { name: { contains: query.trim(), mode: 'insensitive' } },
        { description: { contains: query.trim(), mode: 'insensitive' } },
      ];
    }

    if (category && category.trim()) {
      where.category = {
        name: { contains: category.trim(), mode: 'insensitive' },
      };
    }

    // Filter by merchant location if provided
    if (location && location.trim()) {
      where.merchant = {
        address: {
          contains: location.trim(),
          mode: 'insensitive',
        },
        isActive: true,
      };
    } else {
      // Ensure merchant is active even if no location filter
      where.merchant = {
        isActive: true,
      };
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        merchant: {
          select: {
            id: true,
            businessName: true,
            logo: true,
            address: true,
            rating: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            icon: true,
          },
        },
        Offer: {
          where: {
            isActive: true,
            startTime: { lte: new Date() },
            endTime: { gte: new Date() },
          },
        },
      },
    });

    return products.map(product => ({
      ...product,
      offer: product.Offer?.[0] || null,
    }));
  }

  // Search for categories specifically
  private async searchCategories({ query }: { query?: string }) {
    const where: any = {};

    if (query && query.trim()) {
      where.OR = [
        { name: { contains: query.trim(), mode: 'insensitive' } },
        { description: { contains: query.trim(), mode: 'insensitive' } },
      ];
    }

    return prisma.category.findMany({
      where,
      select: {
        id: true,
        name: true,
        description: true,
        icon: true,
        _count: {
          select: {
            merchants: true,
          },
        },
      },
    });
  }

  // Search for merchants specifically
  private async searchMerchants({ query, category, location }: { query?: string; category?: string; location?: string }) {
    const where: any = {
      isActive: true, // Only return active merchants
    };

    if (query && query.trim()) {
      where.OR = [
        { businessName: { contains: query.trim(), mode: 'insensitive' } },
        { description: { contains: query.trim(), mode: 'insensitive' } },
        {
          products: {
            some: {
              OR: [
                { name: { contains: query.trim(), mode: 'insensitive' } },
                { description: { contains: query.trim(), mode: 'insensitive' } },
              ],
            },
          },
        },
      ];
    }

    if (category && category.trim()) {
      where.MerchantCategory = {
        some: {
          category: {
            name: { contains: category.trim(), mode: 'insensitive' },
          },
        },
      };
    }

    if (location && location.trim()) {
      where.address = {
        contains: location.trim(),
        mode: 'insensitive',
      };
    }

    const merchants = await prisma.merchant.findMany({
      where,
      include: {
        user: {
          select: {
            fullName: true,
          },
        },
        MerchantCategory: {
          include: {
            category: true,
          },
        },
        products: {
          where: {
            isAvailable: true, // Only return available products
          },
          take: 5,
          select: {
            id: true,
            name: true,
            price: true,
            salePrice: true,
            images: true,
          },
        },
      },
    });

    return merchants;
  }

  // Get merchant listings with filters
  async getMerchants({ location, category, sort, filter }: MerchantFilters) {
    const where: any = {
      isActive: true,
    };

    if (location) {
      where.address = {
        contains: location,
        mode: 'insensitive',
      };
    }

    if (category) {
      where.MerchantCategory = {
        some: {
          category: {
            name: category,
          },
        },
      };
    }

    if (filter === 'offers') {
      where.Offer = {
        some: {
          isActive: true,
          endTime: {
            gt: new Date(),
          },
        },
      };
    }

    const orderBy: any = {};
    if (sort === 'rating') {
      orderBy.rating = 'desc';
    } else if (sort === 'name') {
      orderBy.businessName = 'asc';
    }

    return prisma.merchant.findMany({
      where,
      orderBy,
      include: {
        user: {
          select: {
            fullName: true,
          },
        },
        MerchantCategory: {
          include: {
            category: true,
          },
        },
        Offer: {
          where: {
            isActive: true,
            endTime: {
              gt: new Date(),
            },
          },
        },
      },
    });
  }

  // Get merchant details
  async getMerchantDetails(id: string) {
    return prisma.merchant.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            fullName: true,
          },
        },
        MerchantCategory: {
          include: {
            category: true,
          },
        },
        products: {
          where: {
            isAvailable: true,
          },
        },
        Offer: {
          where: {
            isActive: true,
            endTime: {
              gt: new Date(),
            },
          },
        },
      },
    });
  }

  // Get current offers
  async getOffers(location?: string) {
    const where: any = {
      isActive: true,
      endTime: {
        gt: new Date(),
      },
    };

    if (location) {
      where.merchant = {
        address: {
          contains: location,
          mode: 'insensitive',
        },
      };
    }

    return prisma.offer.findMany({
      where,
      include: {
        merchant: {
          select: {
            id: true,
            businessName: true,
            logo: true,
          },
        },
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            salePrice: true,
            images: true,
          },
        },
      },
    });
  }

  // Get personalized recommendations
  async getRecommendations(userId?: string) {
    if (!userId) {
      // If no user, return popular merchants
      return prisma.merchant.findMany({
        where: {
          isActive: true,
        },
        orderBy: {
          rating: 'desc',
        },
        take: 10,
        include: {
          user: {
            select: {
              fullName: true,
            },
          },
          MerchantCategory: {
            include: {
              category: true,
            },
          },
        },
      });
    }

    // Get user's order history and preferences
    const userOrders = await prisma.order.findMany({
      where: {
        customer: {
          userId,
        },
      },
      include: {
        merchant: {
          include: {
            MerchantCategory: {
              include: {
                category: true,
              },
            },
          },
        },
      },
    });

    // Extract preferred categories
    const preferredCategories = new Set<string>();
    userOrders.forEach(order => {
      order.merchant.MerchantCategory.forEach(mc => {
        preferredCategories.add(mc.category.name);
      });
    });

    // Get recommended merchants based on preferences
    return prisma.merchant.findMany({
      where: {
        isActive: true,
        MerchantCategory: {
          some: {
            category: {
              name: {
                in: Array.from(preferredCategories),
              },
            },
          },
        },
      },
      orderBy: {
        rating: 'desc',
      },
      take: 10,
      include: {
        user: {
          select: {
            fullName: true,
          },
        },
        MerchantCategory: {
          include: {
            category: true,
          },
        },
      },
    });
  }

  // Get user favorites
  async getFavorites(userId: string) {
    return prisma.favorite.findMany({
      where: {
        userId,
      },
      include: {
        merchant: {
          include: {
            user: {
              select: {
                fullName: true,
              },
            },
            MerchantCategory: {
              include: {
                category: true,
              },
            },
          },
        },
      },
    });
  }

  // Add to favorites
  async addToFavorites(userId: string, merchantId: string) {
    return prisma.favorite.create({
      data: {
        userId,
        merchantId,
      },
      include: {
        merchant: {
          include: {
            user: {
              select: {
                fullName: true,
              },
            },
            MerchantCategory: {
              include: {
                category: true,
              },
            },
          },
        },
      },
    });
  }

  // Remove from favorites
  async removeFromFavorites(userId: string, id: string) {
    return prisma.favorite.delete({
      where: {
        id,
        userId,
      },
    });
  }

  // Get explore options
  async getExploreOptions(location?: string) {
    const where: any = {};

    if (location) {
      where.location = {
        path: ['city'],
        equals: location,
      };
    }

    return prisma.exploreOption.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
} 