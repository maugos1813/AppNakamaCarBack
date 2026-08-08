import { Router } from 'express';
import { authenticateClientAccess } from '../../middlewares/authenticateClientAccess';
import { clientPortalController } from './clientPortal.controller';

// Mounted at /client/:token — no staff auth, the token itself is the credential.
export const clientPortalRouter = Router({ mergeParams: true });

clientPortalRouter.use(authenticateClientAccess);
clientPortalRouter.get('/', clientPortalController.getSummary);
clientPortalRouter.post('/estimate/approve', clientPortalController.approveEstimate);
clientPortalRouter.post('/estimate/reject', clientPortalController.rejectEstimate);
clientPortalRouter.get('/invoice/pdf', clientPortalController.downloadInvoicePdf);
