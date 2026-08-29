import { reportsRepository } from './reports.repository';

const DAY_MS = 24 * 60 * 60 * 1000;

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export const reportsService = {
  async getMechanicProductivity(months: number) {
    const since = new Date();
    since.setMonth(since.getMonth() - months);

    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const [rows, activeMechanics] = await Promise.all([
      reportsRepository.findCompletedSince(since),
      reportsRepository.findActiveMechanics(),
    ]);

    // The where clause already guarantees these at the DB level, but the
    // select's type stays nullable — narrow once, reuse below.
    const validRows = rows.filter(
      (row): row is typeof row & { completedByUserId: string; completedAt: Date } =>
        row.completedByUserId !== null && row.completedAt !== null,
    );

    const byUser = new Map<string, { count: number; totalDays: number; thisMonth: number }>();
    for (const row of validRows) {
      const days = (row.completedAt.getTime() - row.entryDate.getTime()) / DAY_MS;
      const bucket = byUser.get(row.completedByUserId) ?? { count: 0, totalDays: 0, thisMonth: 0 };
      bucket.count += 1;
      bucket.totalDays += days;
      if (row.completedAt >= monthStart) bucket.thisMonth += 1;
      byUser.set(row.completedByUserId, bucket);
    }

    // Always include every active mechanic (even at zero completions — that
    // absence is itself the signal this report exists to surface), plus
    // anyone else (e.g. an admin) who happens to have completions on record.
    const allUserIds = new Set([...byUser.keys(), ...activeMechanics.map((m) => m.id)]);
    const users = await reportsRepository.findUsersByIds([...allUserIds]);
    const nameById = new Map(users.map((u) => [u.id, u.fullName]));

    const byMechanic = [...allUserIds]
      .map((userId) => {
        const bucket = byUser.get(userId);
        return {
          userId,
          fullName: nameById.get(userId) ?? 'Usuario eliminado',
          completedCount: bucket?.count ?? 0,
          completedThisMonth: bucket?.thisMonth ?? 0,
          avgRepairDays: bucket && bucket.count > 0 ? round1(bucket.totalDays / bucket.count) : null,
        };
      })
      .sort((a, b) => b.completedCount - a.completedCount);

    const overallCount = validRows.length;
    const overallAvgDays =
      overallCount > 0
        ? round1(
            validRows.reduce((sum, r) => sum + (r.completedAt.getTime() - r.entryDate.getTime()) / DAY_MS, 0) /
              overallCount,
          )
        : null;

    return {
      periodMonths: months,
      overall: { completedCount: overallCount, avgRepairDays: overallAvgDays },
      byMechanic,
    };
  },
};
