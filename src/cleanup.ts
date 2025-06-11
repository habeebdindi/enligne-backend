import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

async function main() {
  await cleanup();
}

main()
  .catch((e) => {
    console.error('💥 Cleanup script failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log('🔌 Database connection closed.');
  }); 