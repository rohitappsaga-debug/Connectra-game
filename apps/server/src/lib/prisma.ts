import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? [{ level: 'query', emit: 'event' }, 'error', 'warn']
    : ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

if (process.env.NODE_ENV !== 'development') globalForPrisma.prisma = prisma;

if (process.env.NODE_ENV === 'development') {
  (prisma as any).$on('query', (e: any) => {
    if (e.duration > 100) {
      logger.warn('Slow Prisma query', { query: e.query, duration: `${e.duration}ms` });
    }
  });
}

export async function warmupDb() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    logger.info('Database connection pool warmed up');
  } catch (error) {
    logger.error('Database warmup failed', { error });
  }
}
