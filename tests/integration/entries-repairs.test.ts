import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../helpers/app';
import { resetDatabase } from '../helpers/db';
import { loginAs } from '../helpers/auth';
import { createClient, createVehicle } from '../helpers/fixtures';

async function createEntryViaApi(token: string, vehicleId: string) {
  const res = await request(app)
    .post('/api/v1/entries')
    .set('Authorization', `Bearer ${token}`)
    .send({ vehicleId, odometerReading: 50000, fuelLevel: 'HALF' });
  return res.body.data as { id: string };
}

describe('Entries + Repair stages', () => {
  let token: string;
  let vehicleId: string;

  beforeEach(async () => {
    await resetDatabase();
    ({ token } = await loginAs('ADMIN'));
    const client = await createClient();
    const vehicle = await createVehicle(client.id);
    vehicleId = vehicle.id;
  });

  it('auto-seeds exactly the 7 canonical stages, in order, all PENDING', async () => {
    const entry = await createEntryViaApi(token, vehicleId);

    const res = await request(app)
      .get(`/api/v1/entries/${entry.id}/stages`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(7);
    expect(res.body.data.map((s: { stage: string }) => s.stage)).toEqual([
      'DIAGNOSIS',
      'DISASSEMBLY',
      'BODYWORK',
      'PAINTING',
      'ASSEMBLY',
      'QUALITY_CHECK',
      'READY_FOR_DELIVERY',
    ]);
    expect(res.body.data.every((s: { status: string }) => s.status === 'PENDING')).toBe(true);
  });

  it('rejects an invalid entry status transition (IN_PROGRESS -> DELIVERED)', async () => {
    const entry = await createEntryViaApi(token, vehicleId);
    const res = await request(app)
      .patch(`/api/v1/entries/${entry.id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'DELIVERED' });

    expect(res.status).toBe(400);
  });

  it('allows DIAGNOSIS to start without an approved estimate', async () => {
    const entry = await createEntryViaApi(token, vehicleId);
    const stages = await request(app)
      .get(`/api/v1/entries/${entry.id}/stages`)
      .set('Authorization', `Bearer ${token}`);
    const diagnosis = stages.body.data.find((s: { stage: string }) => s.stage === 'DIAGNOSIS');

    const res = await request(app)
      .patch(`/api/v1/stages/${diagnosis.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'IN_PROGRESS' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('IN_PROGRESS');
  });

  it('blocks BODYWORK from starting until the client approves the estimate, then unblocks it', async () => {
    const entry = await createEntryViaApi(token, vehicleId);

    await request(app)
      .post(`/api/v1/entries/${entry.id}/labor`)
      .set('Authorization', `Bearer ${token}`)
      .send({ description: 'Chapa', hours: 2, hourlyRate: 40 });

    const stagesBefore = await request(app)
      .get(`/api/v1/entries/${entry.id}/stages`)
      .set('Authorization', `Bearer ${token}`);
    const bodyworkId = stagesBefore.body.data.find((s: { stage: string }) => s.stage === 'BODYWORK').id;

    const blocked = await request(app)
      .patch(`/api/v1/stages/${bodyworkId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'IN_PROGRESS' });
    expect(blocked.status).toBe(400);

    await request(app)
      .patch(`/api/v1/entries/${entry.id}/estimate/request-approval`)
      .set('Authorization', `Bearer ${token}`);

    // Approve via the client-facing endpoint, using a freshly-signed token —
    // this exercises the exact link a client would click from the email.
    const clientAccessToken = await import('../../src/lib/clientAccessToken');
    const entryDetail = await request(app)
      .get(`/api/v1/entries/${entry.id}`)
      .set('Authorization', `Bearer ${token}`);
    const linkToken = clientAccessToken.signClientAccessToken(entry.id, entryDetail.body.data.vehicle.clientId);

    const approve = await request(app).post(`/api/v1/client/${linkToken}/estimate/approve`);
    expect(approve.status).toBe(200);
    expect(approve.body.data.estimateStatus).toBe('APPROVED');

    const unblocked = await request(app)
      .patch(`/api/v1/stages/${bodyworkId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'IN_PROGRESS' });
    expect(unblocked.status).toBe(200);
  });

  it('rejects requesting approval when there is nothing billable yet', async () => {
    const entry = await createEntryViaApi(token, vehicleId);
    const res = await request(app)
      .patch(`/api/v1/entries/${entry.id}/estimate/request-approval`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
  });

  it('GET /entries/:id/estimate aggregates labor, parts and other costs correctly', async () => {
    const entry = await createEntryViaApi(token, vehicleId);
    await request(app)
      .post(`/api/v1/entries/${entry.id}/labor`)
      .set('Authorization', `Bearer ${token}`)
      .send({ description: 'Mano de obra', hours: 2, hourlyRate: 50 }); // 100
    await request(app)
      .post(`/api/v1/entries/${entry.id}/parts`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Faro', quantity: 2, unitCost: 10, unitPrice: 30 }); // 60
    await request(app)
      .post(`/api/v1/entries/${entry.id}/costs`)
      .set('Authorization', `Bearer ${token}`)
      .send({ description: 'Remolque', amount: 15 }); // 15

    const res = await request(app)
      .get(`/api/v1/entries/${entry.id}/estimate`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.body.data.labor.total).toBe(100);
    expect(res.body.data.parts.total).toBe(60);
    expect(res.body.data.otherCosts.total).toBe(15);
    expect(res.body.data.grandTotal).toBe(175);
  });

  it('ignores a client-supplied total and recomputes it server-side', async () => {
    const entry = await createEntryViaApi(token, vehicleId);
    const res = await request(app)
      .post(`/api/v1/entries/${entry.id}/labor`)
      .set('Authorization', `Bearer ${token}`)
      .send({ description: 'Test', hours: 3, hourlyRate: 20, total: 999999 });

    expect(res.body.data.total).toBe('60');
  });
});
