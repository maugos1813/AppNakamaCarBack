import { isProduction } from '../config/env';
import { logger } from './logger';
import { remindersService } from '../modules/reminders/reminders.service';

const DAY_MS = 24 * 60 * 60 * 1000;

async function runRemindersSafely(): Promise<void> {
  try {
    const result = await remindersService.run();
    logger.info({ result }, 'Scheduled reminders run completed');
  } catch (err) {
    logger.error({ err }, 'Scheduled reminders run failed');
  }
}

// Only runs in production — local dev and this app's production backend
// share the same database, and this sends real emails to real clients.
// Nothing here is lost by skipping it locally: the same job is reachable
// on demand (with a dry-run preview) via POST /reminders/run.
export function startScheduler(): void {
  if (!isProduction) {
    logger.info('Scheduler skipped (not running in production).');
    return;
  }
  void runRemindersSafely();
  setInterval(runRemindersSafely, DAY_MS);
  logger.info('Scheduler started — reminders run once every 24h.');
}
