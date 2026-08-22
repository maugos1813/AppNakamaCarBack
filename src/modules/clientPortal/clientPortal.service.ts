import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { ApiError } from '../../utils/ApiError';
import { env } from '../../config/env';
import { sendEmail } from '../../lib/email';
import { logger } from '../../lib/logger';
import { uploadToR2 } from '../../lib/r2';
import { entriesRepository } from '../entries/entries.repository';
import { entriesService } from '../entries/entries.service';
import { repairsRepository } from '../repairs/repairs.repository';
import { photosRepository } from '../photos/photos.repository';
import { invoicesRepository } from '../invoices/invoices.repository';
import { invoicesService } from '../invoices/invoices.service';
import { buildEmailHtml } from '../notifications/notifications.service';
import type { RejectEstimateInput } from './clientPortal.validation';

const MAX_RECEIPT_IMAGE_WIDTH_PX = 2000;

// Only these statuses have money still owed and no confirmed payment yet —
// the two buttons in the portal (and these endpoints) only make sense then.
const PAYABLE_STATUSES = ['ISSUED', 'PARTIALLY_PAID'];

async function loadEntry(entryId: string) {
  const entry = await entriesRepository.findById(entryId);
  if (!entry) {
    throw ApiError.notFound('Vehicle entry not found.');
  }
  return entry;
}

export const clientPortalService = {
  async getSummary(entryId: string) {
    const entry = await loadEntry(entryId);

    const [stages, photos, estimate, invoice] = await Promise.all([
      repairsRepository.findByEntryId(entryId),
      photosRepository.findByEntryId(entryId),
      entriesService.getEstimate(entryId),
      invoicesRepository.findByVehicleEntryId(entryId),
    ]);

    return {
      vehicle: {
        licensePlate: entry.vehicle.licensePlate,
        make: entry.vehicle.make,
        model: entry.vehicle.model,
      },
      status: entry.status,
      estimateStatus: entry.estimateStatus,
      estimateRespondedAt: entry.estimateRespondedAt,
      estimateRejectionReason: entry.estimateRejectionReason,
      entryDate: entry.entryDate,
      estimatedCompletionDate: entry.estimatedCompletionDate,
      stages: stages.map((s) => ({ stage: s.stage, status: s.status, order: s.order })),
      photos: photos.map((p) => ({ url: p.url, category: p.category, caption: p.caption, createdAt: p.createdAt })),
      estimate,
      invoice: invoice
        ? {
            id: invoice.id,
            status: invoice.status,
            invoiceNumber: invoice.invoiceNumber,
            canPay: PAYABLE_STATUSES.includes(invoice.status),
            officePaymentRequestedAt: invoice.officePaymentRequestedAt,
            receiptsUploaded: await invoicesRepository.countReceipts(invoice.id),
          }
        : null,
    };
  },

  async approveEstimate(entryId: string) {
    const entry = await loadEntry(entryId);
    if (entry.estimateStatus !== 'PENDING_APPROVAL') {
      throw ApiError.badRequest(`Estimate cannot be approved from status ${entry.estimateStatus}.`);
    }

    const updated = await entriesRepository.update(entryId, {
      estimateStatus: 'APPROVED',
      estimateRespondedAt: new Date(),
      estimateRejectionReason: null,
    });

    await entriesRepository.createHistoryEvent({
      vehicleEntryId: entryId,
      eventType: 'ESTIMATE_APPROVED',
      description: 'Client approved the repair estimate.',
    });

    return updated;
  },

  async rejectEstimate(entryId: string, input: RejectEstimateInput) {
    const entry = await loadEntry(entryId);
    if (entry.estimateStatus !== 'PENDING_APPROVAL') {
      throw ApiError.badRequest(`Estimate cannot be rejected from status ${entry.estimateStatus}.`);
    }

    const updated = await entriesRepository.update(entryId, {
      estimateStatus: 'REJECTED',
      estimateRespondedAt: new Date(),
      estimateRejectionReason: input.reason ?? null,
    });

    await entriesRepository.createHistoryEvent({
      vehicleEntryId: entryId,
      eventType: 'ESTIMATE_REJECTED',
      description: `Client rejected the repair estimate.${input.reason ? ` Reason: ${input.reason}` : ''}`,
    });

    return updated;
  },

  async getInvoicePdf(entryId: string) {
    await loadEntry(entryId);
    const invoice = await invoicesRepository.findByVehicleEntryId(entryId);
    if (!invoice) {
      throw ApiError.notFound('No invoice exists for this vehicle entry yet.');
    }
    return invoicesService.getInvoicePdf(invoice.id);
  },

  async loadPayableInvoice(entryId: string) {
    const invoice = await invoicesRepository.findByVehicleEntryId(entryId);
    if (!invoice) {
      throw ApiError.notFound('No invoice exists for this vehicle entry yet.');
    }
    if (!PAYABLE_STATUSES.includes(invoice.status)) {
      throw ApiError.badRequest(`This invoice cannot be paid from status ${invoice.status}.`);
    }
    return invoice;
  },

  async uploadPaymentReceipt(entryId: string, file: Express.Multer.File) {
    const entry = await loadEntry(entryId);
    const invoice = await clientPortalService.loadPayableInvoice(entryId);

    let buffer: Buffer;
    let contentType: string;
    let extension: string;
    let sizeBytes: number;

    if (file.mimetype === 'application/pdf') {
      buffer = file.buffer;
      contentType = 'application/pdf';
      extension = 'pdf';
      sizeBytes = file.buffer.length;
    } else {
      const { data, info } = await sharp(file.buffer)
        .rotate()
        .resize({ width: MAX_RECEIPT_IMAGE_WIDTH_PX, withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer({ resolveWithObject: true });
      buffer = data;
      contentType = 'image/webp';
      extension = 'webp';
      sizeBytes = info.size;
    }

    const storageKey = `invoices/${invoice.id}/receipts/${randomUUID()}.${extension}`;
    const url = await uploadToR2(storageKey, buffer, contentType);

    const receipt = await invoicesRepository.createReceipt({
      invoiceId: invoice.id,
      url,
      storageKey,
      fileName: file.originalname,
      mimeType: contentType,
      sizeBytes,
    });

    await entriesRepository.createHistoryEvent({
      vehicleEntryId: entryId,
      eventType: 'PAYMENT_RECEIPT_UPLOADED',
      description: `Client uploaded a payment receipt for invoice ${invoice.invoiceNumber ?? invoice.id}.`,
    });

    sendEmail(
      env.ADMIN_NOTIFY_EMAIL,
      `Comprobante de pago recibido — Factura ${invoice.invoiceNumber ?? invoice.id}`,
      buildEmailHtml(
        'Nuevo comprobante de pago',
        `${entry.vehicle.client.fullName} subió un comprobante de pago para la factura ${invoice.invoiceNumber ?? invoice.id} (vehículo ${entry.vehicle.licensePlate}).`,
        { url: receipt.url, label: 'Ver comprobante' },
      ),
    ).catch((err) => logger.error({ err }, 'Failed to notify admin about an uploaded payment receipt'));

    return receipt;
  },

  async requestOfficePayment(entryId: string) {
    const entry = await loadEntry(entryId);
    const invoice = await clientPortalService.loadPayableInvoice(entryId);

    if (invoice.officePaymentRequestedAt) {
      // Already declared — idempotent no-op so a client re-checking the
      // portal doesn't fire a second email to the office.
      return invoice;
    }

    const updated = await invoicesRepository.update(invoice.id, { officePaymentRequestedAt: new Date() });

    await entriesRepository.createHistoryEvent({
      vehicleEntryId: entryId,
      eventType: 'OFFICE_PAYMENT_REQUESTED',
      description: `Client indicated they will pay invoice ${invoice.invoiceNumber ?? invoice.id} in person at the office.`,
    });

    sendEmail(
      env.ADMIN_NOTIFY_EMAIL,
      `Cliente pagará en oficina — Factura ${invoice.invoiceNumber ?? invoice.id}`,
      buildEmailHtml(
        'Pago en oficina',
        `${entry.vehicle.client.fullName} avisó que va a pagar en persona la factura ${invoice.invoiceNumber ?? invoice.id} (vehículo ${entry.vehicle.licensePlate}).`,
      ),
    ).catch((err) => logger.error({ err }, 'Failed to notify admin about an office payment request'));

    return updated;
  },
};
