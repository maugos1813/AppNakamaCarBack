import type { Prisma, NotificationType, VehicleEntryStatus } from '@prisma/client';
import { sendEmail } from '../../lib/email';
import { logger } from '../../lib/logger';
import { buildClientTrackingUrl } from '../../lib/clientAccessToken';
import { entriesRepository } from '../entries/entries.repository';
import { ApiError } from '../../utils/ApiError';
import { notificationsRepository } from './notifications.repository';

interface Recipient {
  id: string;
  email: string | null;
  fullName: string;
}

export function buildEmailHtml(title: string, message: string, link?: { url: string; label: string }): string {
  const button = link
    ? `<p style="margin-top: 24px;"><a href="${link.url}" style="background: #1a1a1a; color: #fff; padding: 10px 20px; border-radius: 6px; text-decoration: none;">${link.label}</a></p>`
    : '';

  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #1a1a1a;">${title}</h2>
      <p style="color: #444; line-height: 1.5;">${message}</p>
      ${button}
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
  link?: { url: string; label: string };
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
      buildEmailHtml(params.title, params.message, params.link),
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

// Fans an in-app-only notification out to every active admin — no email,
// so it never fails the way notifyClient can.
async function notifyAllAdmins(params: {
  title: string;
  message: string;
  relatedVehicleEntryId?: string;
}): Promise<void> {
  const admins = await notificationsRepository.findActiveAdminIds();
  await Promise.all(
    admins.map((admin) =>
      notificationsRepository.create({
        type: 'GENERIC',
        channel: 'IN_APP',
        title: params.title,
        message: params.message,
        status: 'SENT',
        sentAt: new Date(),
        recipientUserId: admin.id,
        relatedVehicleEntryId: params.relatedVehicleEntryId,
      }),
    ),
  );
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
      link: { url: buildClientTrackingUrl(vehicleEntryId, entry.vehicle.client.id), label: 'Segui la riparazione' },
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
      link: { url: buildClientTrackingUrl(params.vehicleEntryId, params.client.id), label: 'Vedi i dettagli' },
    });
  },

  async notifyEstimatePendingApproval(
    vehicleEntryId: string,
    pending: {
      labor: { description: string; total: Prisma.Decimal | number | string }[];
      parts: { name: string; quantity: number; total: Prisma.Decimal | number | string }[];
      otherCosts: { description: string; amount: Prisma.Decimal | number | string }[];
      subtotal: number;
      taxRate: number;
      taxAmount: number;
      totalWithTax: number;
      isAdditional: boolean;
    },
  ): Promise<void> {
    const entry = await entriesRepository.findById(vehicleEntryId);
    if (!entry) return;

    const client = entry.vehicle.client;

    const lines = [
      ...pending.labor.map((item) => `• ${item.description} — €${Number(item.total).toFixed(2)}`),
      ...pending.parts.map(
        (item) => `• ${item.name}${item.quantity > 1 ? ` × ${item.quantity}` : ''} — €${Number(item.total).toFixed(2)}`,
      ),
      ...pending.otherCosts.map((item) => `• ${item.description} — €${Number(item.amount).toFixed(2)}`),
    ];
    const itemsList = lines.length > 0 ? `<br>${lines.join('<br>')}<br><br>` : '';
    const taxBreakdown = `Imponibile: €${pending.subtotal.toFixed(2)}<br>IVA (${pending.taxRate}%): €${pending.taxAmount.toFixed(2)}<br>Totale (IVA inclusa): €${pending.totalWithTax.toFixed(2)}`;

    const title = pending.isAdditional ? 'Nuovo costo aggiuntivo da approvare' : 'Preventivo pronto per approvazione';
    const message = pending.isAdditional
      ? `Durante la riparazione del veicolo targa ${entry.vehicle.licensePlate} è stato aggiunto un costo aggiuntivo, da approvare separatamente rispetto a quanto già confermato:${itemsList}${taxBreakdown}<br><br>Questo importo si somma a quanto già approvato in precedenza.`
      : `Il preventivo per il veicolo targa ${entry.vehicle.licensePlate} è pronto:${itemsList}${taxBreakdown}<br><br>Prima di iniziare la riparazione abbiamo bisogno della tua conferma.`;

    await notifyClient({
      recipient: { id: client.id, email: client.email, fullName: client.fullName },
      vehicleEntryId,
      type: 'ESTIMATE_PENDING_APPROVAL',
      title,
      message,
      link: { url: buildClientTrackingUrl(vehicleEntryId, client.id), label: 'Vedi e approva il preventivo' },
    });
  },

  async listByEntry(vehicleEntryId: string) {
    const entry = await entriesRepository.findById(vehicleEntryId);
    if (!entry) {
      throw ApiError.notFound('Vehicle entry not found.');
    }
    return notificationsRepository.findByEntryId(vehicleEntryId);
  },

  // In-app only — no email, so it never fails the way notifyClient can, and
  // isn't wrapped in the same try/catch delivery-tracking dance. Shared by
  // every notifyAdmins* helper below.
  async notifyAdminsNewWorkRequest(params: {
    vehicleEntryId: string;
    licensePlate: string;
    description: string;
    createdByName: string;
  }): Promise<void> {
    await notifyAllAdmins({
      title: `Nueva richiesta — ${params.licensePlate}`,
      message: `${params.createdByName} agregó: "${params.description}"`,
      relatedVehicleEntryId: params.vehicleEntryId,
    });
  },

  async notifyAdminsEstimateRejected(params: {
    vehicleEntryId: string;
    licensePlate: string;
    clientName: string;
    reason: string | null;
  }): Promise<void> {
    await notifyAllAdmins({
      title: `Presupuesto rechazado — ${params.licensePlate}`,
      message: `${params.clientName} rechazó el presupuesto.${params.reason ? ` Motivo: "${params.reason}"` : ''}`,
      relatedVehicleEntryId: params.vehicleEntryId,
    });
  },

  async notifyAdminsPaymentReceiptUploaded(params: {
    vehicleEntryId: string;
    licensePlate: string;
    clientName: string;
    invoiceNumber: string | null;
  }): Promise<void> {
    await notifyAllAdmins({
      title: `Comprobante de pago — ${params.licensePlate}`,
      message: `${params.clientName} subió un comprobante de pago${params.invoiceNumber ? ` para la factura ${params.invoiceNumber}` : ''}.`,
      relatedVehicleEntryId: params.vehicleEntryId,
    });
  },

  async notifyAdminsLowStock(params: { name: string; quantity: string | number; unit: string }): Promise<void> {
    await notifyAllAdmins({
      title: `Stock bajo — ${params.name}`,
      message: `Quedan ${params.quantity} ${params.unit} de "${params.name}". Puede que haga falta reponer.`,
    });
  },

  listMine(userId: string) {
    return notificationsRepository.findByUserId(userId);
  },

  async markRead(id: string, userId: string) {
    const updated = await notificationsRepository.markRead(id, userId);
    if (!updated) {
      throw ApiError.notFound('Notification not found.');
    }
    return updated;
  },
};
