import prisma from '../lib/prisma';

export class OfferService {
  async getOffers(tag?: string) {
    // If tag is provided, filter offers by tag (assuming tags is a string[] field)
    const where: any = {
      isActive: true,
      endTime: { gte: new Date() }
    };
    if (tag) {
      where.tags = { has: tag };
    }
    return prisma.offer.findMany({
      where,
      orderBy: { endTime: 'asc' },
    });
  }

  async getOfferDetails(id: string) {
    return prisma.offer.findUnique({
      where: { id },
    });
  }
} 