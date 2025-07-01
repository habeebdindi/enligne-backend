import prisma from '../src/lib/prisma';
import { Role } from '@prisma/client';

async function cleanup() {
  console.log('🗑️  Starting database cleanup...');
  
  try {
    // Delete all data in the correct order (respecting foreign key constraints)
    await prisma.$transaction([
      prisma.notification.deleteMany(),
      prisma.review.deleteMany(),
      prisma.payment.deleteMany(),
      prisma.delivery.deleteMany(),
      prisma.orderItem.deleteMany(),
      prisma.order.deleteMany(),
      prisma.cartItem.deleteMany(),
      prisma.cart.deleteMany(),
      prisma.favorite.deleteMany(),
      prisma.offer.deleteMany(),
      prisma.product.deleteMany(),
      prisma.merchantCategory.deleteMany(),
      prisma.category.deleteMany(),
      prisma.exploreOption.deleteMany(),
      prisma.merchant.deleteMany(),
      prisma.customer.deleteMany(),
      prisma.rider.deleteMany(),
      prisma.address.deleteMany(),
      prisma.user.deleteMany(),
    ]);

    console.log('✅ Database cleanup completed successfully!');
    console.log('📊 All tables have been emptied.');
  } catch (error) {
    console.error('❌ Error during database cleanup:', error);
    throw error;
  }
}

async function fixMerchantProfiles() {
  console.log('🔧 Starting merchant profile cleanup...');

  // Find users with MERCHANT role who don't have merchant profiles
  const merchantUsersWithoutProfiles = await prisma.user.findMany({
    where: {
      role: Role.MERCHANT,
      merchant: null, // Users without merchant profiles
    },
  });

  console.log(`Found ${merchantUsersWithoutProfiles.length} merchant users without profiles`);

  // Create merchant profiles for these users
  for (const user of merchantUsersWithoutProfiles) {
    try {
      await prisma.merchant.create({
        data: {
          userId: user.id,
          businessName: user.fullName, // Use fullName as default businessName
          address: 'Address not provided', // Default address
          location: { lat: 0, lng: 0 }, // Default location
          businessPhone: user.phone,
          businessEmail: user.email,
          openingHours: {
            monday: { open: '09:00', close: '18:00' },
            tuesday: { open: '09:00', close: '18:00' },
            wednesday: { open: '09:00', close: '18:00' },
            thursday: { open: '09:00', close: '18:00' },
            friday: { open: '09:00', close: '18:00' },
            saturday: { open: '09:00', close: '18:00' },
            sunday: { open: '09:00', close: '18:00' },
          },
        }
      });
      console.log(`✅ Created merchant profile for user: ${user.fullName} (${user.email})`);
    } catch (error) {
      console.error(`❌ Failed to create merchant profile for user: ${user.email}`, error);
    }
  }

  console.log('✨ Merchant profile cleanup completed!');
}

async function main() {
  try {
    await cleanup();
    await fixMerchantProfiles();
  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main();
}

export { fixMerchantProfiles }; 