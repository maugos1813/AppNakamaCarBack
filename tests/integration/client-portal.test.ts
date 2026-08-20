import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../helpers/app';
import { resetDatabase } from '../helpers/db';
import { loginAs } from '../helpers/auth';
import { createClient, createVehicle } from '../helpers/fixtures';
import { signClientAccessToken } from '../../src/lib/clientAccessToken';

describe('Client portal (no-login access via link token)', () => {
  let token: string;
  let entryId: string;
  let clientId: string;

  beforeEach(async () => {
    await resetDatabase();
    ({ token } = await loginAs('ADMIN'));
    const client = await createClient();
    clientId = client.id;
    const vehicle = await createVehicle(clientId);

    const entryRes = await request(app)
      .post('/api/v1/entries')
      .set('Authorization', `Bearer ${token}`)
      .send({ vehicleId: vehicle.id, odometerReading: 20000, fuelLevel: 'FULL' });
    entryId = entryRes.body.data.id;

    await request(app)
      .post(`/api/v1/entries/${entryId}/labor`)
      .set('Authorization', `Bearer ${token}`)
      .send({ description: 'Test', hours: 1, hourlyRate: 100 });
  });

  it('rejects a garbage token with 401', async () => {
    const res = await request(app).get('/api/v1/client/not-a-real-token');
    expect(res.status).toBe(401);
  });

  it('rejects an expired-shaped/tampered token with 401', async () => {
    const validToken = signClientAccessToken(entryId, clientId);
    const tampered = `${validToken}x`;
    const res = await request(app).get(`/api/v1/client/${tampered}`);
    expect(res.status).toBe(401);
  });

  it('returns the tracking summary with no staff auth at all', async () => {
    const linkToken = signClientAccessToken(entryId, clientId);
    const res = await request(app).get(`/api/v1/client/${linkToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.estimate.grandTotal).toBe(100);
    expect(res.body.data.stages).toHaveLength(7);
  });

  it('rejects approving an estimate that was never requested (still DRAFT)', async () => {
    const linkToken = signClientAccessToken(entryId, clientId);
    const res = await request(app).post(`/api/v1/client/${linkToken}/estimate/approve`);
    expect(res.status).toBe(400);
  });

  it('rejecting the estimate records the reason and blocks re-approval', async () => {
    await request(app)
      .patch(`/api/v1/entries/${entryId}/estimate/request-approval`)
      .set('Authorization', `Bearer ${token}`);

    const linkToken = signClientAccessToken(entryId, clientId);
    const reject = await request(app)
      .post(`/api/v1/client/${linkToken}/estimate/reject`)
      .send({ reason: 'Troppo caro' });
    expect(reject.status).toBe(200);
    expect(reject.body.data.estimateStatus).toBe('REJECTED');

    const approveAfterReject = await request(app).post(`/api/v1/client/${linkToken}/estimate/approve`);
    expect(approveAfterReject.status).toBe(400);
  });

  it('404s the invoice PDF route when no invoice exists yet', async () => {
    const linkToken = signClientAccessToken(entryId, clientId);
    const res = await request(app).get(`/api/v1/client/${linkToken}/invoice/pdf`);
    expect(res.status).toBe(404);
  });
});
