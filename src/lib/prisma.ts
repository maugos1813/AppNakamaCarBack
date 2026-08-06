import { PrismaClient } from '@prisma/client';
import { isDevelopment } from '../config/env';

// Node's module cache already guarantees this runs once per process, so a
// single exported instance is enough to keep one connection pool for the
// whole app — every repository imports this instead of creating its own client.
export const prisma = new PrismaClient({
  log: isDevelopment ? ['warn', 'error'] : ['error'],
});
