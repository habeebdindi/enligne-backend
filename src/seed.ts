import { PrismaClient, Role, OrderStatus, PaymentStatus, DeliveryStatus, OfferType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Clean up existing data
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

  // Create admin user
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@enligne.com',
      phone: '+250788123456',
      fullName: 'Admin User',
      password: await bcrypt.hash('Admin@123', 10),
      role: Role.ADMIN,
      isVerified: true,
    },
  });

  // Create categories
  const categories = await Promise.all([
    prisma.category.create({
      data: {
        name: 'Restaurant',
        description: 'Food and beverage establishments',
        icon: 'restaurant',
      },
    }),
    prisma.category.create({
      data: {
        name: 'Pharmacy',
        description: 'Medical and health products',
        icon: 'pharmacy',
      },
    }),
    prisma.category.create({
      data: {
        name: 'Supermarket',
        description: 'Grocery and household items',
        icon: 'store',
      },
    }),
  ]);

  // Create merchants
  const merchants = await Promise.all([
    prisma.merchant.create({
      data: {
        user: {
          create: {
            email: 'merchant1@enligne.com',
            phone: '+250788123457',
            fullName: 'Restaurant Owner',
            password: await bcrypt.hash('Merchant@123', 10),
            role: Role.MERCHANT,
            isVerified: true,
          },
        },
        businessName: 'Tasty Bites',
        description: 'Delicious local cuisine',
        address: 'KN 4 Ave, Kigali',
        location: { lat: -1.9536, lng: 30.0605 },
        businessPhone: '+250788123458',
        businessEmail: 'contact@tastybites.com',
        openingHours: {
          monday: { open: '08:00', close: '22:00' },
          tuesday: { open: '08:00', close: '22:00' },
          wednesday: { open: '08:00', close: '22:00' },
          thursday: { open: '08:00', close: '22:00' },
          friday: { open: '08:00', close: '23:00' },
          saturday: { open: '09:00', close: '23:00' },
          sunday: { open: '09:00', close: '22:00' },
        },
        isVerified: true,
        MerchantCategory: {
          create: {
            categoryId: categories[0].id,
          },
        },
      },
    }),
    prisma.merchant.create({
      data: {
        user: {
          create: {
            email: 'merchant2@enligne.com',
            phone: '+250788123459',
            fullName: 'Pharmacy Owner',
            password: await bcrypt.hash('Merchant@123', 10),
            role: Role.MERCHANT,
            isVerified: true,
          },
        },
        businessName: 'Health Plus Pharmacy',
        description: 'Your trusted health partner',
        address: 'KG 7 Ave, Kigali',
        location: { lat: -1.9536, lng: 30.0605 },
        businessPhone: '+250788123460',
        businessEmail: 'contact@healthplus.com',
        openingHours: {
          monday: { open: '07:00', close: '21:00' },
          tuesday: { open: '07:00', close: '21:00' },
          wednesday: { open: '07:00', close: '21:00' },
          thursday: { open: '07:00', close: '21:00' },
          friday: { open: '07:00', close: '21:00' },
          saturday: { open: '08:00', close: '20:00' },
          sunday: { open: '08:00', close: '20:00' },
        },
        isVerified: true,
        MerchantCategory: {
          create: {
            categoryId: categories[1].id,
          },
        },
      },
    }),
  ]);

  // Create customers
  const customers = await Promise.all([
    prisma.customer.create({
      data: {
        user: {
          create: {
            email: 'customer1@enligne.com',
            phone: '+250788123461',
            fullName: 'John Doe',
            password: await bcrypt.hash('Customer@123', 10),
            role: Role.CUSTOMER,
            isVerified: true,
          },
        },
      },
    }),
    prisma.customer.create({
      data: {
        user: {
          create: {
            email: 'customer2@enligne.com',
            phone: '+250788123462',
            fullName: 'Jane Smith',
            password: await bcrypt.hash('Customer@123', 10),
            role: Role.CUSTOMER,
            isVerified: true,
          },
        },
      },
    }),
  ]);

  // Create riders
  const riders = await Promise.all([
    prisma.rider.create({
      data: {
        user: {
          create: {
            email: 'rider1@enligne.com',
            phone: '+250788123463',
            fullName: 'Rider One',
            password: await bcrypt.hash('Rider@123', 10),
            role: Role.RIDER,
            isVerified: true,
          },
        },
        isAvailable: true,
        vehicleType: 'Motorcycle',
        vehicleNumber: 'RID001',
        rating: 4.5,
      },
    }),
    prisma.rider.create({
      data: {
        user: {
          create: {
            email: 'rider2@enligne.com',
            phone: '+250788123464',
            fullName: 'Rider Two',
            password: await bcrypt.hash('Rider@123', 10),
            role: Role.RIDER,
            isVerified: true,
          },
        },
        isAvailable: true,
        vehicleType: 'Bicycle',
        vehicleNumber: 'RID002',
        rating: 4.8,
      },
    }),
  ]);

  // Create products for first merchant (Restaurant)
  const restaurantProducts = await Promise.all([
    prisma.product.create({
      data: {
        merchantId: merchants[0].id,
        name: 'Chicken Burger',
        description: 'Juicy chicken burger with fresh vegetables',
        price: 5000,
        images: ['burger1.jpg', 'burger2.jpg'],
        categoryId: categories[0].id,
        isAvailable: true,
        preparationTime: 15,
        stockQuantity: 50,
      },
    }),
    prisma.product.create({
      data: {
        merchantId: merchants[0].id,
        name: 'French Fries',
        description: 'Crispy golden fries',
        price: 2000,
        images: ['fries1.jpg'],
        categoryId: categories[0].id,
        isAvailable: true,
        preparationTime: 10,
        stockQuantity: 100,
      },
    }),
    prisma.product.create({
      data: {
        merchantId: merchants[0].id,
        name: 'Coca Cola',
        description: 'Coca Cola 500ml',
        price: 1000,
        images: ['coca.jpg'],
        categoryId: categories[0].id,
        isAvailable: true,
        preparationTime: 10,
        stockQuantity: 100,
      },
    }),
    prisma.product.create({
      data: {
        merchantId: merchants[0].id,
        name: 'Beer',
        description: 'Beer 500ml',
        price: 1000,
        images: ['beer.jpg'],
        categoryId: categories[0].id,
        isAvailable: true,
        preparationTime: 10,
        stockQuantity: 100,
      },
    }),
  ]);

  // Create products for second merchant (Pharmacy)
  const pharmacyProducts = await Promise.all([
    prisma.product.create({
      data: {
        merchantId: merchants[1].id,
        name: 'Paracetamol 500mg',
        description: 'Pain relief tablets',
        price: 1000,
        images: ['paracetamol.jpg'],
        categoryId: categories[1].id,
        isAvailable: true,
        stockQuantity: 200,
      },
    }),
    prisma.product.create({
      data: {
        merchantId: merchants[1].id,
        name: 'Vitamin C 1000mg',
        description: 'Immune system support',
        price: 2500,
        images: ['vitaminc.jpg'],
        categoryId: categories[1].id,
        isAvailable: true,
        stockQuantity: 150,
      },
    }),
    prisma.product.create({
      data: {
        merchantId: merchants[1].id,
        name: 'Paracetamol 500mg',
        description: 'Pain relief tablets',
        price: 1000,
        images: ['paracetamol.jpg'],
        categoryId: categories[1].id,
        isAvailable: true,
        stockQuantity: 100,
      },
    }),
  ]);

  // Create offers
  await Promise.all([
    prisma.offer.create({
      data: {
        title: 'Weekend Special',
        description: '20% off on all burgers',
        discountType: OfferType.PERCENTAGE,
        discountValue: 20,
        startTime: new Date(),
        endTime: new Date(Date.now() + 31 * 24 * 60 * 60 * 1000), // 31 days from now
        merchantId: merchants[0].id,
        isActive: true,
      },
    }),
    prisma.offer.create({
      data: {
        title: 'Buy 2 Get 1 Free',
        description: 'Buy 2 paracetamol packs, get 1 free',
        discountType: OfferType.FIXED,
        discountValue: 1000,
        startTime: new Date(),
        endTime: new Date(Date.now() + 31 * 24 * 60 * 60 * 1000), // 31 days from now
        merchantId: merchants[1].id,
        productId: pharmacyProducts[0].id,
        isActive: true,
      },
    }),
  ]);

  // Create addresses for customers
  const addresses = await Promise.all([
    prisma.address.create({
      data: {
        userId: customers[0].userId,
        label: 'Home',
        street: 'KN 5 Ave',
        city: 'Kigali',
        state: 'Kigali',
        postalCode: '0000',
        landmark: 'Near Kigali Convention Center',
        location: { lat: -1.9536, lng: 30.0605 },
        isDefault: true,
      },
    }),
    prisma.address.create({
      data: {
        userId: customers[1].userId,
        label: 'Work',
        street: 'KG 7 Ave',
        city: 'Kigali',
        state: 'Kigali',
        postalCode: '0000',
        landmark: 'Near Kigali Heights',
        location: { lat: -1.9536, lng: 30.0605 },
        isDefault: true,
      },
    }),
  ]);

  // Create sample orders
  const orders = await Promise.all([
    // Order 1: Delivered restaurant order
    prisma.order.create({
      data: {
        customerId: customers[0].id,
        merchantId: merchants[0].id,
        addressId: addresses[0].id,
        subtotal: 7000,
        deliveryFee: 1000,
        platformFee: 500,
        total: 8500,
        status: OrderStatus.DELIVERED,
        paymentStatus: PaymentStatus.PAID,
        paymentMethod: 'Mobile Money',
        items: {
          create: [
            {
              productId: restaurantProducts[0].id,
              name: restaurantProducts[0].name,
              price: restaurantProducts[0].price,
              quantity: 1,
            },
            {
              productId: restaurantProducts[1].id,
              name: restaurantProducts[1].name,
              price: restaurantProducts[1].price,
              quantity: 1,
            },
          ],
        },
        delivery: {
          create: {
            riderId: riders[0].id,
            status: DeliveryStatus.DELIVERED,
            pickupLocation: merchants[0].location as { lat: number; lng: number },
            dropoffLocation: addresses[0].location as { lat: number; lng: number },
            distance: 2.5,
            startTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
            endTime: new Date(Date.now() - 1 * 60 * 60 * 1000),
            trackingCode: 'TRK001',
          },
        },
      },
    }),

    // Order 2: Pending pharmacy order
    prisma.order.create({
      data: {
        customerId: customers[0].id,
        merchantId: merchants[1].id,
        addressId: addresses[0].id,
        subtotal: 3500,
        deliveryFee: 800,
        platformFee: 300,
        total: 4600,
        status: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING,
        paymentMethod: 'Card',
        items: {
          create: [
            {
              productId: pharmacyProducts[0].id,
              name: pharmacyProducts[0].name,
              price: pharmacyProducts[0].price,
              quantity: 2,
            },
            {
              productId: pharmacyProducts[1].id,
              name: pharmacyProducts[1].name,
              price: pharmacyProducts[1].price,
              quantity: 1,
            },
          ],
        },
      },
    }),

    // Order 3: Confirmed restaurant order
    prisma.order.create({
      data: {
        customerId: customers[1].id,
        merchantId: merchants[0].id,
        addressId: addresses[1].id,
        subtotal: 10000,
        deliveryFee: 1200,
        platformFee: 600,
        total: 11800,
        status: OrderStatus.CONFIRMED,
        paymentStatus: PaymentStatus.PAID,
        paymentMethod: 'Mobile Money',
        estimatedDeliveryTime: new Date(Date.now() + 45 * 60 * 1000), // 45 minutes from now
        items: {
          create: [
            {
              productId: restaurantProducts[0].id,
              name: restaurantProducts[0].name,
              price: restaurantProducts[0].price,
              quantity: 2,
            },
          ],
        },
        delivery: {
          create: {
            riderId: riders[1].id,
            status: DeliveryStatus.ASSIGNED,
            pickupLocation: merchants[0].location as { lat: number; lng: number },
            dropoffLocation: addresses[1].location as { lat: number; lng: number },
            distance: 3.2,
            trackingCode: 'TRK002',
          },
        },
      },
    }),

    // Order 4: Delivered pharmacy order
    prisma.order.create({
      data: {
        customerId: customers[1].id,
        merchantId: merchants[1].id,
        addressId: addresses[1].id,
        subtotal: 5000,
        deliveryFee: 1000,
        platformFee: 400,
        discount: 500, // Applied discount
        total: 5900,
        status: OrderStatus.DELIVERED,
        paymentStatus: PaymentStatus.PAID,
        paymentMethod: 'Cash',
        items: {
          create: [
            {
              productId: pharmacyProducts[1].id,
              name: pharmacyProducts[1].name,
              price: pharmacyProducts[1].price,
              quantity: 2,
            },
          ],
        },
        delivery: {
          create: {
            riderId: riders[0].id,
            status: DeliveryStatus.DELIVERED,
            pickupLocation: merchants[1].location as { lat: number; lng: number },
            dropoffLocation: addresses[1].location as { lat: number; lng: number },
            distance: 1.8,
            startTime: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
            endTime: new Date(Date.now() - 3.5 * 60 * 60 * 1000), // 3.5 hours ago
            trackingCode: 'TRK003',
          },
        },
      },
    }),

    // Order 5: In transit restaurant order
    prisma.order.create({
      data: {
        customerId: customers[0].id,
        merchantId: merchants[0].id,
        addressId: addresses[0].id,
        subtotal: 12000,
        deliveryFee: 1500,
        platformFee: 700,
        tax: 200,
        total: 14400,
        status: OrderStatus.IN_TRANSIT,
        paymentStatus: PaymentStatus.PAID,
        paymentMethod: 'Mobile Money',
        estimatedDeliveryTime: new Date(Date.now() + 20 * 60 * 1000), // 20 minutes from now
        notes: 'Please call when you arrive',
        items: {
          create: [
            {
              productId: restaurantProducts[0].id,
              name: restaurantProducts[0].name,
              price: restaurantProducts[0].price,
              quantity: 1,
            },
            {
              productId: restaurantProducts[1].id,
              name: restaurantProducts[1].name,
              price: restaurantProducts[1].price,
              quantity: 3,
              notes: 'Extra crispy please',
            },
          ],
        },
        delivery: {
          create: {
            riderId: riders[1].id,
            status: DeliveryStatus.IN_TRANSIT,
            pickupLocation: merchants[0].location as { lat: number; lng: number },
            dropoffLocation: addresses[0].location as { lat: number; lng: number },
            distance: 4.1,
            startTime: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
            trackingCode: 'TRK004',
            notes: 'Traffic delay expected',
          },
        },
      },
    }),
  ]);

  // Create reviews
  await Promise.all([
    prisma.review.create({
      data: {
        userId: customers[0].userId,
        merchantId: merchants[0].id,
        rating: 5,
        comment: 'Great food and fast delivery!',
        images: ['review1.jpg'],
      },
    }),
    prisma.review.create({
      data: {
        userId: customers[1].userId,
        merchantId: merchants[1].id,
        rating: 4,
        comment: 'Good service and reasonable prices',
        images: ['review2.jpg'],
      },
    }),
  ]);

  // Create notifications
  await Promise.all([
    prisma.notification.create({
      data: {
        userId: customers[0].userId,
        title: 'Order Delivered',
        message: 'Your order #123 has been delivered successfully',
        type: 'Order',
        isRead: false,
        metadata: { orderId: orders[0].id },
      },
    }),
  ]);

  console.log('Seed data created successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 