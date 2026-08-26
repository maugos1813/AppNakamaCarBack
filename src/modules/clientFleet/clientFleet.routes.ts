import { Router } from 'express';
import { authenticateClientSession } from '../../middlewares/authenticateClientSession';
import { uploadReceipt } from '../../middlewares/upload';
import { clientFleetController } from './clientFleet.controller';

// Mounted at /client-fleet — the premium, session-based counterpart to
// /client/:token (which stays as-is for every other client, one entry per
// magic link). Same underlying business logic either way, via clientPortalService.
export const clientFleetRouter = Router();

clientFleetRouter.use(authenticateClientSession);

clientFleetRouter.get('/vehicles', clientFleetController.listVehicles);
clientFleetRouter.get('/entries/:entryId', clientFleetController.getEntry);
clientFleetRouter.post('/entries/:entryId/estimate/approve', clientFleetController.approveEstimate);
clientFleetRouter.post('/entries/:entryId/estimate/reject', clientFleetController.rejectEstimate);
clientFleetRouter.get('/entries/:entryId/invoice/pdf', clientFleetController.downloadInvoicePdf);
clientFleetRouter.post(
  '/entries/:entryId/invoice/receipt',
  uploadReceipt.single('receipt'),
  clientFleetController.uploadPaymentReceipt,
);
clientFleetRouter.post('/entries/:entryId/invoice/pay-at-office', clientFleetController.requestOfficePayment);
