import { initializeApp, cert, type App } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { env } from '../config/env';
import { logger } from './logger';

let app: App | null = null;

if (env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    const serviceAccount = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT);
    app = initializeApp({ credential: cert(serviceAccount) });
    logger.info('Firebase Admin initialized — push notifications enabled.');
  } catch (err) {
    logger.error({ err }, 'Failed to parse/initialize FIREBASE_SERVICE_ACCOUNT — push notifications disabled.');
  }
} else {
  logger.warn('FIREBASE_SERVICE_ACCOUNT not set — push notifications disabled.');
}

/**
 * Fans a notification out to every given device token. Never throws — a
 * failed push must not block whatever business operation triggered it, same
 * spirit as notifyClient's email delivery. Returns which tokens are dead
 * (uninstalled app, expired registration) so the caller can stop sending to
 * them going forward.
 */
export async function sendPushNotification(
  tokens: string[],
  payload: { title: string; body: string; data?: Record<string, string> },
): Promise<{ invalidTokens: string[] }> {
  if (!app || tokens.length === 0) return { invalidTokens: [] };

  try {
    const response = await getMessaging(app).sendEachForMulticast({
      tokens,
      notification: { title: payload.title, body: payload.body },
      data: payload.data,
    });

    const invalidTokens = response.responses
      .map((result, i) => {
        const code = result.error?.code;
        // invalid-argument covers a malformed token (never a valid FCM
        // registration to begin with), the other two cover one that used to
        // be valid and has since died (app uninstalled, etc).
        const isDead =
          code === 'messaging/invalid-registration-token' ||
          code === 'messaging/registration-token-not-registered' ||
          code === 'messaging/invalid-argument';
        return isDead ? tokens[i] : null;
      })
      .filter((token): token is string => token !== null);

    return { invalidTokens };
  } catch (err) {
    logger.error({ err }, 'Failed to send push notification');
    return { invalidTokens: [] };
  }
}
