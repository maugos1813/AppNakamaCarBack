import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { invoicesController } from './invoices.controller';

// Mounted at /entries/:entryId/invoice (needs mergeParams to read entryId).
export const entryInvoiceRouter = Router({ mergeParams: true });
entryInvoiceRouter.use(authenticate);
entryInvoiceRouter.post('/', authorize('ADMIN'), invoicesController.createForEntry);

// Mounted flat at /invoices. Reading is open to both roles; every write
// action is financial/legal and restricted to ADMIN.
export const invoicesRouter = Router();
invoicesRouter.use(authenticate);
invoicesRouter.get('/', invoicesController.list);
invoicesRouter.get('/:id', invoicesController.getById);
invoicesRouter.patch('/:id/issue', authorize('ADMIN'), invoicesController.issue);
invoicesRouter.patch('/:id/cancel', authorize('ADMIN'), invoicesController.cancel);
invoicesRouter.post('/:id/payments', authorize('ADMIN'), invoicesController.recordPayment);
