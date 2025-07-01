import { PrismaClient } from '@prisma/client';

declare global {
  var prisma: PrismaClient | undefined;
}

// Connection monitoring for development
const logConnectionInfo = () => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`🔌 Prisma connection pool status at ${new Date().toISOString()}`);
  }
};

// Prevent multiple instances of Prisma Client in development
const prisma = global.prisma || new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  },
  // Configure connection pool for development
  ...(process.env.NODE_ENV === 'development' && {
    log: [
      {
        emit: 'event',
        level: 'query',
      },
      {
        emit: 'event',
        level: 'error',
      },
      {
        emit: 'event',
        level: 'warn',
      },
    ],
  })
});

// Event listeners for development monitoring
if (process.env.NODE_ENV === 'development') {
  (prisma as any).$on('query', (e: any) => {
    if (process.env.DEBUG_QUERIES === 'true') {
      console.log('Query: ' + e.query);
      console.log('Duration: ' + e.duration + 'ms');
    }
  });

  (prisma as any).$on('error', (e: any) => {
    console.error('🔴 Prisma Error:', e);
  });

  (prisma as any).$on('warn', (e: any) => {
    console.warn('🟡 Prisma Warning:', e);
  });

  // Log connection info on startup
  logConnectionInfo();
}

if (process.env.NODE_ENV === 'development') {
  global.prisma = prisma;
}

// Graceful shutdown handler
process.on('beforeExit', async () => {
  console.log('🔌 Disconnecting from database...');
  await prisma.$disconnect();
});

process.on('SIGINT', async () => {
  console.log('🔌 Gracefully shutting down - disconnecting from database...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🔌 Received SIGTERM - disconnecting from database...');
  await prisma.$disconnect();
  process.exit(0);
});

export default prisma; 