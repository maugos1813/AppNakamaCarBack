import { STAGE_ORDER } from '../repairs/repairs.repository';
import { dashboardRepository } from './dashboard.repository';

const ENTRY_STATUSES = ['IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'DELIVERED'] as const;

export const dashboardService = {
  async getSummary() {
    const [entriesByStatusRaw, stagesInProgressRaw, readyForPickup, totalClients, totalVehicles] =
      await Promise.all([
        dashboardRepository.countEntriesByStatus(),
        dashboardRepository.countStagesInProgressByName(),
        dashboardRepository.countReadyForPickup(),
        dashboardRepository.countClients(),
        dashboardRepository.countVehicles(),
      ]);

    const entriesByStatus = Object.fromEntries(
      ENTRY_STATUSES.map((status) => [
        status,
        entriesByStatusRaw.find((row) => row.status === status)?._count._all ?? 0,
      ]),
    );

    const stagesInProgress = Object.fromEntries(
      STAGE_ORDER.map((stage) => [
        stage,
        stagesInProgressRaw.find((row) => row.stage === stage)?._count._all ?? 0,
      ]),
    );

    return {
      entriesByStatus,
      activeEntries: entriesByStatus.IN_PROGRESS,
      stagesInProgress,
      readyForPickup,
      totalClients,
      totalVehicles,
    };
  },

  getActivity(limit: number) {
    return dashboardRepository.recentActivity(limit);
  },
};
