import { Prisma, type RepairStage, type RepairStageName } from '@prisma/client';
import { prisma } from '../../lib/prisma';

export type StageRecord = RepairStage;

export const STAGE_ORDER: RepairStageName[] = [
  'DIAGNOSIS',
  'DISASSEMBLY',
  'BODYWORK',
  'PAINTING',
  'ASSEMBLY',
  'QUALITY_CHECK',
  'READY_FOR_DELIVERY',
];

export const repairsRepository = {
  findById(id: string): Promise<StageRecord | null> {
    return prisma.repairStage.findUnique({ where: { id } });
  },

  findByEntryId(vehicleEntryId: string): Promise<StageRecord[]> {
    return prisma.repairStage.findMany({
      where: { vehicleEntryId },
      orderBy: { order: 'asc' },
    });
  },

  createDefaultStages(vehicleEntryId: string): Promise<Prisma.BatchPayload> {
    return prisma.repairStage.createMany({
      data: STAGE_ORDER.map((stage, index) => ({
        vehicleEntryId,
        stage,
        order: index + 1,
      })),
    });
  },

  update(id: string, data: Prisma.RepairStageUncheckedUpdateInput): Promise<StageRecord> {
    return prisma.repairStage.update({ where: { id }, data });
  },
};
