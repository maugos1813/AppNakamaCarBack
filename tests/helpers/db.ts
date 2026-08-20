import { prisma } from '../../src/lib/prisma';

// Order matters for TRUNCATE ... CASCADE to be safe regardless of FK direction
// — CASCADE handles it, but listing children-first keeps intent readable.
const TABLES = [
  'notifications',
  'activity_logs',
  'payments',
  'invoice_items',
  'invoices',
  'other_costs',
  'parts',
  'labor_items',
  'repair_history',
  'repair_stages',
  'damages',
  'vehicle_photos',
  'vehicle_entries',
  'vehicles',
  'clients',
  'users',
  'roles',
];

export async function resetDatabase(): Promise<void> {
  await prisma.$transaction(
    TABLES.map((table) => prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE`)),
  );
}

export { prisma };
