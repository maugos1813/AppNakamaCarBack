import { notificationsService } from '../notifications/notifications.service';
import { remindersRepository } from './reminders.repository';

// Matches the Dashboard's own "pendientes de hoy" threshold — the same
// definition of "stale" everywhere in the app.
const STALE_READY_FOR_PICKUP_DAYS = 3;
// Don't nag the same client more than once every N days for the same thing.
const RESEND_INTERVAL_DAYS = 3;

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

export const remindersService = {
  // dryRun: true only finds candidates — no email is sent and no
  // "reminder sent" timestamp is touched. Lets an admin preview who would
  // be contacted, and lets this be exercised safely against a real
  // database without actually emailing anyone.
  async run({ dryRun = false }: { dryRun?: boolean } = {}) {
    const staleThreshold = daysAgo(STALE_READY_FOR_PICKUP_DAYS);
    const resendThreshold = daysAgo(RESEND_INTERVAL_DAYS);

    const stalePickups = await remindersRepository.findStalePickups(staleThreshold, resendThreshold);
    const overdueInvoices = await remindersRepository.findOverdueInvoices(resendThreshold);

    if (!dryRun) {
      for (const entry of stalePickups) {
        await notificationsService.notifyClientPickupReminder(entry.id);
        await remindersRepository.markPickupReminderSent(entry.id);
      }
      for (const invoice of overdueInvoices) {
        await notificationsService.notifyClientOverdueInvoiceReminder(invoice.id);
        await remindersRepository.markOverdueReminderSent(invoice.id);
      }
    }

    return {
      dryRun,
      pickupReminders: stalePickups.length,
      overdueInvoiceReminders: overdueInvoices.length,
    };
  },
};
