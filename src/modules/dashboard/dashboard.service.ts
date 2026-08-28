import { STAGE_ORDER } from '../repairs/repairs.repository';
import { dashboardRepository } from './dashboard.repository';

const ENTRY_STATUSES = ['IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'DELIVERED'] as const;

// How long a vehicle can sit COMPLETED before "pendientes de hoy" flags it
// as stale and waiting on the customer to come get it.
const STALE_READY_FOR_PICKUP_DAYS = 3;

export const dashboardService = {
  async getSummary() {
    const [
      entriesByStatusRaw,
      stagesInProgressRaw,
      readyForPickup,
      totalClients,
      totalVehicles,
      pendingWorkRequests,
      staleReadyForPickup,
      overdueInvoices,
    ] = await Promise.all([
      dashboardRepository.countEntriesByStatus(),
      dashboardRepository.countStagesInProgressByName(),
      dashboardRepository.countReadyForPickup(),
      dashboardRepository.countClients(),
      dashboardRepository.countVehicles(),
      dashboardRepository.countPendingWorkRequests(),
      dashboardRepository.countStaleReadyForPickup(STALE_READY_FOR_PICKUP_DAYS),
      dashboardRepository.countOverdueInvoices(),
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
      // "Today's pending" — what actually needs a human decision right
      // now, as opposed to the stats above which are just current counts.
      pendingToday: {
        workRequestsPending: pendingWorkRequests,
        staleReadyForPickup,
        staleReadyForPickupDays: STALE_READY_FOR_PICKUP_DAYS,
        overdueInvoices,
      },
    };
  },

  getActivity(limit: number) {
    return dashboardRepository.recentActivity(limit);
  },
};
