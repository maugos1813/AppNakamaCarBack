import { prisma } from './db';

let counter = 0;
function unique(prefix: string): string {
  counter += 1;
  return `${prefix}${Date.now()}${counter}`;
}

export async function createClient(overrides: Partial<{ email: string; fullName: string; phone: string }> = {}) {
  return prisma.client.create({
    data: {
      fullName: overrides.fullName ?? 'Test Client',
      phone: overrides.phone ?? '3330000000',
      email: overrides.email,
    },
  });
}

export async function createVehicle(clientId: string, overrides: Partial<{ licensePlate: string }> = {}) {
  return prisma.vehicle.create({
    data: {
      clientId,
      licensePlate: overrides.licensePlate ?? unique('TT').toUpperCase().slice(0, 7),
      make: 'Fiat',
      model: 'Panda',
    },
  });
}

export async function createEntry(vehicleId: string, receivedByUserId: string) {
  return prisma.vehicleEntry.create({
    data: {
      vehicleId,
      receivedByUserId,
      odometerReading: 50000,
      fuelLevel: 'HALF',
    },
  });
}
