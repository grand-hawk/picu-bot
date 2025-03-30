import { PrismaClient } from '@prisma/client';

import { log } from '@/pino';

export const prisma = new PrismaClient();

await prisma
  .$connect()
  .then(() => log.info('Database connected'))
  .catch((err) => log.error(err, 'Database connection error'));
