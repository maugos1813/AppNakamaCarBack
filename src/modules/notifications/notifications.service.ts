import type { NotificationType, VehicleEntryStatus } from '@prisma/client';
import { sendEmail } from '../../lib/email';
import { logger } from '../../lib/logger';
import { entriesRepository } from '../entries/entries.repository';
import { ApiError } from '../../utils/ApiError';
import { notificationsRepository } from './notifications.repository';

interface Recipient {
  id: string;
  email: string | null;
  fullName: string;
}

function buildEmailHtml(title: string, message: string): string {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #1a1a1a;">${title}</h2>
      <p style="color: #444; line-height: 1.5;">${message}</p>
      <p style="color: #999; font-size: 12px; margin-top: 32px;">NakamaCar Carrozzeria</p>
    </div>
  `;
}

/**
 * Creates the Notification record and attempts delivery. Never throws — a
 * failed email must not block the business operation that triggered it
 * (e.g. a mechanic changing a repair stage). Failures are logged and
 * recorded on the Notification row itself for staff to see.
 */
async function notifyClient(params: {
  recipient: Recipient;
  vehicleEntryId: string;
  type: NotificationType;
  title: string;
  message: string;
}): Promise<void> {
  if (!params.recipient.email) {
    await notificationsRepository.create({
      type: params.type,
      channel: 'EMAIL',
      title: params.title,
      message: params.message,
      status: 'FAILED',
      errorMessage: 'Client has no email on file.',
      recipientClientId: params.recipient.id,
      relatedVehicleEntryId: params.vehicleEntryId,
    });
    return;
  }

  const notification = await notificationsRepository.create({
    type: params.type,
    channel: 'EMAIL',
    title: params.title,
    message: params.message,
    status: 'PENDING',
    recipientClientId: params.recipient.id,
    relatedVehicleEntryId: params.vehicleEntryId,
  });

  try {
    const providerMessageId = await sendEmail(
      params.recipient.email,
      params.title,
      buildEmailHtml(params.title, params.message),
    );
    await notificationsRepository.markSent(notification.id, providerMessageId);
  } catch (err) {
    logger.error({ err, notificationId: notification.id }, 'Failed to send notification email');
    await notificationsRepository.markFailed(
      notification.id,
      err instanceof Error ? err.message : 'Unknown error',
    );
  }
}

const STATUS_MESSAGES: Partial<Record<VehicleEntryStatus, { title: string; message: (plate: string) => string }>> = {
  COMPLETED: {
    title: 'Il tuo veicolo è pronto per il ritiro',
    message: (plate) => `La riparazione del veicolo targa ${plate} è stata completata ed è pronta per il ritiro. Contattaci per concordare l'orario.`,
  },
  DELIVERED: {
    title: 'Veicolo consegnato',
    message: (plate) => `Confermiamo la consegna del veicolo targa ${plate}. Grazie per aver scelto la nostra carrozzeria.`,
  },
  CANCELLED: {
    title: 'Intervento annullato',
    message: (plate) => `L'intervento sul veicolo targa ${plate} è stato annullato. Contattaci per maggiori informazioni.`,
  },
};

export const notificationsService = {
  async notifyEntryStatusChange(vehicleEntryId: string, newStatus: VehicleEntryStatus): Promise<void> {
    const template = STATUS_MESSAGES[newStatus];
    if (!template) return; // no client-facing message for this transition (e.g. IN_PROGRESS)

    const entry = await entriesRepository.findById(vehicleEntryId);
    if (!entry) return;

    await notifyClient({
      recipient: {
        id: entry.vehicle.client.id,
        email: entry.vehicle.client.email,
        fullName: entry.vehicle.client.fullName,
      },
      vehicleEntryId,
      type: newStatus === 'COMPLETED' ? 'VEHICLE_READY' : 'GENERIC',
      title: template.title,
      message: template.message(entry.vehicle.licensePlate),
    });
  },

  async notifyInvoiceIssued(params: {
    vehicleEntryId: string;
    invoiceNumber: string;
    totalAmount: string | number;
    client: Recipient;
  }): Promise<void> {
    await notifyClient({
      recipient: params.client,
      vehicleEntryId: params.vehicleEntryId,
      type: 'INVOICE_ISSUED',
      title: 'Fattura emessa',
      message: `È stata emessa la fattura n. ${params.invoiceNumber} per un totale di €${params.totalAmount}. Contattaci per le modalità di pagamento.`,
    });
  },

  async listByEntry(vehicleEntryId: string) {
    const entry = await entriesRepository.findById(vehicleEntryId);
    if (!entry) {
      throw ApiError.notFound('Vehicle entry not found.');
    }
    return notificationsRepository.findByEntryId(vehicleEntryId);
  },
};
