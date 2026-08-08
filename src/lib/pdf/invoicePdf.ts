import PDFDocument from 'pdfkit';
import { env } from '../../config/env';
import type { InvoiceWithRelations } from '../../modules/invoices/invoices.repository';

const PAGE_MARGIN = 50;

function formatDate(date: Date | null): string {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('it-IT');
}

function clientDisplayName(client: InvoiceWithRelations['client']): string {
  return client.isCompany && client.companyName ? client.companyName : client.fullName;
}

export function generateInvoicePdf(invoice: InvoiceWithRelations): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: PAGE_MARGIN });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // --- Header: issuer ---
    doc.fontSize(16).font('Helvetica-Bold').text(env.COMPANY_NAME);
    doc
      .fontSize(9)
      .font('Helvetica')
      .text(`${env.COMPANY_ADDRESS}, ${env.COMPANY_POSTAL_CODE} ${env.COMPANY_CITY} (${env.COMPANY_PROVINCE})`)
      .text(`P.IVA ${env.COMPANY_VAT_NUMBER}`);

    // --- Invoice number/date (top right) ---
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .text(`FATTURA N. ${invoice.invoiceNumber ?? 'BOZZA'}`, PAGE_MARGIN, PAGE_MARGIN, { align: 'right' });
    doc
      .fontSize(9)
      .font('Helvetica')
      .text(`Data emissione: ${formatDate(invoice.issueDate)}`, { align: 'right' })
      .text(`Veicolo: ${invoice.vehicleEntry.vehicle.licensePlate}`, { align: 'right' });

    doc.moveDown(2);

    // --- Client block ---
    doc.fontSize(10).font('Helvetica-Bold').text('Cliente');
    doc.font('Helvetica').fontSize(9);
    doc.text(clientDisplayName(invoice.client));
    if (invoice.client.addressLine) {
      doc.text(`${invoice.client.addressLine}, ${invoice.client.postalCode ?? ''} ${invoice.client.city ?? ''}`);
    }
    if (invoice.client.vatNumber) doc.text(`P.IVA ${invoice.client.vatNumber}`);
    if (invoice.client.fiscalCode) doc.text(`Codice Fiscale ${invoice.client.fiscalCode}`);

    doc.moveDown(2);

    // --- Line items table ---
    const colX = { desc: PAGE_MARGIN, qty: 330, unit: 400, total: 470 };
    const tableTop = doc.y;

    doc.font('Helvetica-Bold').fontSize(9);
    doc.text('Descrizione', colX.desc, tableTop);
    doc.text('Qtà', colX.qty, tableTop);
    doc.text('Prezzo unit.', colX.unit, tableTop);
    doc.text('Totale', colX.total, tableTop);
    doc
      .moveTo(PAGE_MARGIN, tableTop + 15)
      .lineTo(545, tableTop + 15)
      .stroke();

    let y = tableTop + 22;
    doc.font('Helvetica').fontSize(9);
    for (const item of invoice.items) {
      doc.text(item.description, colX.desc, y, { width: 270 });
      doc.text(item.quantity.toString(), colX.qty, y);
      doc.text(`€${item.unitPrice}`, colX.unit, y);
      doc.text(`€${item.total}`, colX.total, y);
      y += 20;
    }

    doc
      .moveTo(PAGE_MARGIN, y + 5)
      .lineTo(545, y + 5)
      .stroke();

    // --- Totals ---
    y += 15;
    doc.font('Helvetica').text('Imponibile', colX.unit, y);
    doc.text(`€${invoice.subtotal}`, colX.total, y);
    y += 15;
    doc.text(`IVA (${invoice.taxRate}%)`, colX.unit, y);
    doc.text(`€${invoice.taxAmount}`, colX.total, y);
    y += 18;
    doc.font('Helvetica-Bold').fontSize(11);
    doc.text('Totale', colX.unit, y);
    doc.text(`€${invoice.totalAmount}`, colX.total, y);

    if (invoice.notes) {
      doc.moveDown(3);
      doc.font('Helvetica').fontSize(9).text(`Note: ${invoice.notes}`);
    }

    doc.end();
  });
}
