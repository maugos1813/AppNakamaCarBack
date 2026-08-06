import { z } from 'zod';
import { registry, idParam, entryIdParam, successEnvelope, jsonContent, errorResponses, AUTH } from './registry';
import { reg } from './helpers';

import { loginSchema } from '../../modules/auth/auth.validation';
import {
  createUserSchema,
  updateUserSchema,
  updateMeSchema,
  changePasswordSchema,
  listUsersQuerySchema,
} from '../../modules/users/users.validation';
import { createClientSchema, updateClientSchema, listClientsQuerySchema } from '../../modules/clients/clients.validation';
import { createVehicleSchema, updateVehicleSchema, listVehiclesQuerySchema } from '../../modules/vehicles/vehicles.validation';
import {
  createEntrySchema,
  updateEntrySchema,
  changeEntryStatusSchema,
  listEntriesQuerySchema,
} from '../../modules/entries/entries.validation';
import { createDamageSchema, updateDamageSchema } from '../../modules/damages/damages.validation';
import { createLaborItemSchema, updateLaborItemSchema } from '../../modules/labor/labor.validation';
import { createPartSchema, updatePartSchema } from '../../modules/parts/parts.validation';
import { createOtherCostSchema, updateOtherCostSchema } from '../../modules/costs/costs.validation';
import { updateStageSchema } from '../../modules/repairs/repairs.validation';
import {
  createInvoiceSchema,
  createPaymentSchema,
  listInvoicesQuerySchema,
} from '../../modules/invoices/invoices.validation';
import { activityQuerySchema } from '../../modules/dashboard/dashboard.validation';
import { financeSummaryQuerySchema } from '../../modules/finance/finance.validation';

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
reg({
  method: 'post',
  path: '/api/v1/auth/login',
  tags: ['Auth'],
  summary: 'Login with email and password, returns a JWT access token.',
  auth: false,
  body: loginSchema,
  successSchema: z.object({ accessToken: z.string(), user: z.record(z.string(), z.unknown()) }),
});
reg({
  method: 'get',
  path: '/api/v1/auth/me',
  tags: ['Auth'],
  summary: 'Get the profile of the currently authenticated user.',
});

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------
reg({ method: 'get', path: '/api/v1/users/roles', tags: ['Users'], summary: 'List available staff roles.' });
reg({
  method: 'patch',
  path: '/api/v1/users/me',
  tags: ['Users'],
  summary: 'Update the authenticated user\'s own profile.',
  body: updateMeSchema,
});
reg({
  method: 'patch',
  path: '/api/v1/users/me/password',
  tags: ['Users'],
  summary: 'Change the authenticated user\'s own password.',
  body: changePasswordSchema,
});
reg({
  method: 'get',
  path: '/api/v1/users',
  tags: ['Users'],
  summary: '[ADMIN] List staff users, paginated.',
  query: listUsersQuerySchema,
});
reg({
  method: 'post',
  path: '/api/v1/users',
  tags: ['Users'],
  summary: '[ADMIN] Create a new staff user (only way to provision an account — no public registration).',
  body: createUserSchema,
  successStatus: 201,
});
reg({ method: 'get', path: '/api/v1/users/{id}', tags: ['Users'], summary: '[ADMIN] Get a staff user by id.', params: idParam });
reg({
  method: 'patch',
  path: '/api/v1/users/{id}',
  tags: ['Users'],
  summary: '[ADMIN] Update a staff user (role, isActive, etc).',
  params: idParam,
  body: updateUserSchema,
});

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------
reg({ method: 'get', path: '/api/v1/clients', tags: ['Clients'], summary: 'List clients, paginated, ?search=', query: listClientsQuerySchema });
reg({ method: 'post', path: '/api/v1/clients', tags: ['Clients'], summary: 'Create a client.', body: createClientSchema, successStatus: 201 });
reg({ method: 'get', path: '/api/v1/clients/{id}', tags: ['Clients'], summary: 'Get a client by id, with their vehicles.', params: idParam });
reg({ method: 'patch', path: '/api/v1/clients/{id}', tags: ['Clients'], summary: 'Update a client.', params: idParam, body: updateClientSchema });
reg({ method: 'delete', path: '/api/v1/clients/{id}', tags: ['Clients'], summary: '[ADMIN] Delete a client (rejected if it has vehicles).', params: idParam });

// ---------------------------------------------------------------------------
// Vehicles
// ---------------------------------------------------------------------------
reg({ method: 'get', path: '/api/v1/vehicles', tags: ['Vehicles'], summary: 'List vehicles, paginated, ?clientId=&search=', query: listVehiclesQuerySchema });
reg({ method: 'post', path: '/api/v1/vehicles', tags: ['Vehicles'], summary: 'Create a vehicle for an existing client.', body: createVehicleSchema, successStatus: 201 });
reg({ method: 'get', path: '/api/v1/vehicles/{id}', tags: ['Vehicles'], summary: 'Get a vehicle by id, with its client.', params: idParam });
reg({ method: 'patch', path: '/api/v1/vehicles/{id}', tags: ['Vehicles'], summary: 'Update a vehicle.', params: idParam, body: updateVehicleSchema });
reg({ method: 'delete', path: '/api/v1/vehicles/{id}', tags: ['Vehicles'], summary: '[ADMIN] Delete a vehicle (rejected if it has repair history).', params: idParam });

// ---------------------------------------------------------------------------
// Vehicle entries (the repair job)
// ---------------------------------------------------------------------------
reg({ method: 'get', path: '/api/v1/entries', tags: ['Entries'], summary: 'List vehicle entries, ?vehicleId=&clientId=&status=', query: listEntriesQuerySchema });
reg({ method: 'post', path: '/api/v1/entries', tags: ['Entries'], summary: 'Register vehicle intake. Auto-seeds the 7 repair stages.', body: createEntrySchema, successStatus: 201 });
reg({ method: 'get', path: '/api/v1/entries/{id}', tags: ['Entries'], summary: 'Get an entry by id, with vehicle/client/receivedBy.', params: idParam });
reg({ method: 'patch', path: '/api/v1/entries/{id}', tags: ['Entries'], summary: 'Update intake details (mileage, fuel level, notes...).', params: idParam, body: updateEntrySchema });
reg({ method: 'get', path: '/api/v1/entries/{id}/history', tags: ['Entries'], summary: 'Repair timeline (RepairHistory) for this entry.', params: idParam });
reg({ method: 'get', path: '/api/v1/entries/{id}/estimate', tags: ['Entries'], summary: 'Aggregated budget: labor + parts + other costs.', params: idParam });
reg({ method: 'patch', path: '/api/v1/entries/{id}/status', tags: ['Entries'], summary: 'Change entry status (validated state machine).', params: idParam, body: changeEntryStatusSchema });

// ---------------------------------------------------------------------------
// Photos
// ---------------------------------------------------------------------------
reg({ method: 'get', path: '/api/v1/entries/{entryId}/photos', tags: ['Photos'], summary: 'List photos for an entry.', params: entryIdParam });
registry.registerPath({
  method: 'post',
  path: '/api/v1/entries/{entryId}/photos',
  tags: ['Photos'],
  summary: 'Upload a photo (multipart/form-data). Server resizes to WebP and stores it in Cloudflare R2.',
  security: AUTH,
  request: {
    params: entryIdParam,
    body: {
      content: {
        'multipart/form-data': {
          schema: z.object({
            photo: z.string().openapi({ type: 'string', format: 'binary', description: 'Image file (jpeg/png/webp, max 10MB)' }),
            category: z.enum(['INTAKE', 'DAMAGE', 'PROGRESS', 'COMPLETION']),
            caption: z.string().optional(),
          }),
        },
      },
    },
  },
  responses: {
    201: jsonContent(successEnvelope(z.record(z.string(), z.unknown())), 'Uploaded'),
    ...errorResponses,
  },
});
reg({ method: 'delete', path: '/api/v1/photos/{id}', tags: ['Photos'], summary: 'Delete a photo (removes the object from R2 too).', params: idParam });

// ---------------------------------------------------------------------------
// Damages
// ---------------------------------------------------------------------------
reg({ method: 'get', path: '/api/v1/entries/{entryId}/damages', tags: ['Damages'], summary: 'List damages for an entry.', params: entryIdParam });
reg({ method: 'post', path: '/api/v1/entries/{entryId}/damages', tags: ['Damages'], summary: 'Log a damage.', params: entryIdParam, body: createDamageSchema, successStatus: 201 });
reg({ method: 'patch', path: '/api/v1/damages/{id}', tags: ['Damages'], summary: 'Update a damage.', params: idParam, body: updateDamageSchema });
reg({ method: 'delete', path: '/api/v1/damages/{id}', tags: ['Damages'], summary: 'Delete a damage.', params: idParam });

// ---------------------------------------------------------------------------
// Labor
// ---------------------------------------------------------------------------
reg({ method: 'get', path: '/api/v1/entries/{entryId}/labor', tags: ['Labor'], summary: 'List labor items for an entry.', params: entryIdParam });
reg({ method: 'post', path: '/api/v1/entries/{entryId}/labor', tags: ['Labor'], summary: 'Add a labor item (total = hours * hourlyRate, server-computed).', params: entryIdParam, body: createLaborItemSchema, successStatus: 201 });
reg({ method: 'patch', path: '/api/v1/labor/{id}', tags: ['Labor'], summary: 'Update a labor item (total recomputed).', params: idParam, body: updateLaborItemSchema });
reg({ method: 'delete', path: '/api/v1/labor/{id}', tags: ['Labor'], summary: 'Delete a labor item.', params: idParam });

// ---------------------------------------------------------------------------
// Parts
// ---------------------------------------------------------------------------
reg({ method: 'get', path: '/api/v1/entries/{entryId}/parts', tags: ['Parts'], summary: 'List parts for an entry.', params: entryIdParam });
reg({ method: 'post', path: '/api/v1/entries/{entryId}/parts', tags: ['Parts'], summary: 'Add a part (total = quantity * unitPrice, server-computed).', params: entryIdParam, body: createPartSchema, successStatus: 201 });
reg({ method: 'patch', path: '/api/v1/parts/{id}', tags: ['Parts'], summary: 'Update a part (total recomputed).', params: idParam, body: updatePartSchema });
reg({ method: 'delete', path: '/api/v1/parts/{id}', tags: ['Parts'], summary: 'Delete a part.', params: idParam });

// ---------------------------------------------------------------------------
// Other costs
// ---------------------------------------------------------------------------
reg({ method: 'get', path: '/api/v1/entries/{entryId}/costs', tags: ['Costs'], summary: 'List other costs for an entry.', params: entryIdParam });
reg({ method: 'post', path: '/api/v1/entries/{entryId}/costs', tags: ['Costs'], summary: 'Add an other cost (e.g. towing).', params: entryIdParam, body: createOtherCostSchema, successStatus: 201 });
reg({ method: 'patch', path: '/api/v1/costs/{id}', tags: ['Costs'], summary: 'Update an other cost.', params: idParam, body: updateOtherCostSchema });
reg({ method: 'delete', path: '/api/v1/costs/{id}', tags: ['Costs'], summary: 'Delete an other cost.', params: idParam });

// ---------------------------------------------------------------------------
// Repair stages
// ---------------------------------------------------------------------------
reg({ method: 'get', path: '/api/v1/entries/{entryId}/stages', tags: ['Repairs'], summary: 'List the 7 repair stages for an entry.', params: entryIdParam });
reg({ method: 'patch', path: '/api/v1/stages/{id}', tags: ['Repairs'], summary: 'Update a stage (status/assignedMechanicId/notes). Validated state machine, writes to RepairHistory.', params: idParam, body: updateStageSchema });

// ---------------------------------------------------------------------------
// Invoices
// ---------------------------------------------------------------------------
reg({ method: 'post', path: '/api/v1/entries/{entryId}/invoice', tags: ['Invoices'], summary: '[ADMIN] Create a DRAFT invoice as a snapshot of the entry\'s current estimate.', params: entryIdParam, body: createInvoiceSchema, successStatus: 201 });
reg({ method: 'get', path: '/api/v1/invoices', tags: ['Invoices'], summary: 'List invoices, ?clientId=&status=', query: listInvoicesQuerySchema });
reg({ method: 'get', path: '/api/v1/invoices/{id}', tags: ['Invoices'], summary: 'Get an invoice with items, payments, amountPaid/amountDue.', params: idParam });
reg({ method: 'patch', path: '/api/v1/invoices/{id}/issue', tags: ['Invoices'], summary: '[ADMIN] Issue a DRAFT invoice — assigns the sequential legal number ("N/YYYY").', params: idParam });
reg({ method: 'patch', path: '/api/v1/invoices/{id}/cancel', tags: ['Invoices'], summary: '[ADMIN] Cancel an invoice (only if it has no payments recorded).', params: idParam });
reg({ method: 'post', path: '/api/v1/invoices/{id}/payments', tags: ['Invoices'], summary: '[ADMIN] Record a payment (status auto-recomputed: ISSUED -> PARTIALLY_PAID -> PAID).', params: idParam, body: createPaymentSchema, successStatus: 201 });

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
reg({ method: 'get', path: '/api/v1/dashboard/summary', tags: ['Dashboard'], summary: 'Entries by status, stages in progress, totals.' });
reg({ method: 'get', path: '/api/v1/dashboard/activity', tags: ['Dashboard'], summary: 'Recent activity feed (RepairHistory across all entries).', query: activityQuerySchema });

// ---------------------------------------------------------------------------
// Finance
// ---------------------------------------------------------------------------
reg({ method: 'get', path: '/api/v1/finance/summary', tags: ['Finance'], summary: '[ADMIN] Invoiced/collected totals, by status, by payment method, revenue by month.', query: financeSummaryQuerySchema });
reg({ method: 'get', path: '/api/v1/finance/overdue', tags: ['Finance'], summary: '[ADMIN] Invoices past their due date, still unpaid.' });
