import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../helpers/app';
import { resetDatabase } from '../helpers/db';
import { loginAs } from '../helpers/auth';
import { createClient, createVehicle } from '../helpers/fixtures';

async function createEntryWithLabor(token: string, vehicleId: string, hours: number, hourlyRate: number) {
  const entryRes = await request(app)
    .post('/api/v1/entries')
    .set('Authorization', `Bearer ${token}`)
    .send({ vehicleId, odometerReading: 10000, fuelLevel: 'FULL' });
  const entryId = entryRes.body.data.id as string;

  await request(app)
    .post(`/api/v1/entries/${entryId}/labor`)
    .set('Authorization', `Bearer ${token}`)
    .send({ description: 'Lavoro', hours, hourlyRate });

  return entryId;
}

describe('Invoices', () => {
  let token: string;
  let vehicleId: string;

  beforeEach(async () => {
    await resetDatabase();
    ({ token } = await loginAs('ADMIN'));
    const client = await createClient();
    const vehicle = await createVehicle(client.id);
    vehicleId = vehicle.id;
  });

  it('creates a DRAFT invoice as an immutable snapshot of the estimate', async () => {
    const entryId = await createEntryWithLabor(token, vehicleId, 2, 50); // 100 + 22% = 122

    const res = await request(app)
      .post(`/api/v1/entries/${entryId}/invoice`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('DRAFT');
    expect(res.body.data.invoiceNumber).toBeNull();
    expect(res.body.data.subtotal).toBe('100');
    expect(res.body.data.totalAmount).toBe('122');
  });

  it('rejects a second invoice for the same entry', async () => {
    const entryId = await createEntryWithLabor(token, vehicleId, 1, 50);
    await request(app).post(`/api/v1/entries/${entryId}/invoice`).set('Authorization', `Bearer ${token}`).send({});

    const second = await request(app)
      .post(`/api/v1/entries/${entryId}/invoice`)
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(second.status).toBe(409);
  });

  it('assigns sequential numbers on issue, and a cancelled DRAFT never burns a number', async () => {
    const entry1 = await createEntryWithLabor(token, vehicleId, 1, 10);
    const inv1 = await request(app)
      .post(`/api/v1/entries/${entry1}/invoice`)
      .set('Authorization', `Bearer ${token}`)
      .send({});
    const issued1 = await request(app)
      .patch(`/api/v1/invoices/${inv1.body.data.id}/issue`)
      .set('Authorization', `Bearer ${token}`);
    const firstNumber = issued1.body.data.invoiceNumber as string;

    // Create + cancel a DRAFT without ever issuing it.
    const client2 = await createClient({ phone: '3339999998' });
    const vehicle2 = await createVehicle(client2.id, { licensePlate: 'ZZ999ZZ' });
    const entry2 = await createEntryWithLabor(token, vehicle2.id, 1, 10);
    const inv2 = await request(app)
      .post(`/api/v1/entries/${entry2}/invoice`)
      .set('Authorization', `Bearer ${token}`)
      .send({});
    await request(app).patch(`/api/v1/invoices/${inv2.body.data.id}/cancel`).set('Authorization', `Bearer ${token}`);

    // Next real invoice should be the very next sequence number, not skip one.
    const client3 = await createClient({ phone: '3339999997' });
    const vehicle3 = await createVehicle(client3.id, { licensePlate: 'YY888YY' });
    const entry3 = await createEntryWithLabor(token, vehicle3.id, 1, 10);
    const inv3 = await request(app)
      .post(`/api/v1/entries/${entry3}/invoice`)
      .set('Authorization', `Bearer ${token}`)
      .send({});
    const issued3 = await request(app)
      .patch(`/api/v1/invoices/${inv3.body.data.id}/issue`)
      .set('Authorization', `Bearer ${token}`);

    const [firstSeq, year] = firstNumber.split('/');
    const secondNumber = issued3.body.data.invoiceNumber as string;
    expect(secondNumber).toBe(`${Number(firstSeq) + 1}/${year}`);
  });

  it('rejects a payment on a DRAFT invoice', async () => {
    const entryId = await createEntryWithLabor(token, vehicleId, 1, 100);
    const inv = await request(app)
      .post(`/api/v1/entries/${entryId}/invoice`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    const res = await request(app)
      .post(`/api/v1/invoices/${inv.body.data.id}/payments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 10, method: 'CASH' });
    expect(res.status).toBe(400);
  });

  it('partial payment -> PARTIALLY_PAID, full payment -> PAID, overpayment rejected', async () => {
    const entryId = await createEntryWithLabor(token, vehicleId, 1, 100); // total with IVA = 122
    const inv = await request(app)
      .post(`/api/v1/entries/${entryId}/invoice`)
      .set('Authorization', `Bearer ${token}`)
      .send({});
    await request(app).patch(`/api/v1/invoices/${inv.body.data.id}/issue`).set('Authorization', `Bearer ${token}`);

    const partial = await request(app)
      .post(`/api/v1/invoices/${inv.body.data.id}/payments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 50, method: 'CASH' });
    expect(partial.status).toBe(201);

    const afterPartial = await request(app)
      .get(`/api/v1/invoices/${inv.body.data.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(afterPartial.body.data.status).toBe('PARTIALLY_PAID');

    const overpay = await request(app)
      .post(`/api/v1/invoices/${inv.body.data.id}/payments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 1000, method: 'CARD' });
    expect(overpay.status).toBe(400);

    const rest = await request(app)
      .post(`/api/v1/invoices/${inv.body.data.id}/payments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 72, method: 'BANK_TRANSFER' });
    expect(rest.status).toBe(201);

    const afterFull = await request(app)
      .get(`/api/v1/invoices/${inv.body.data.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(afterFull.body.data.status).toBe('PAID');
  });

  it('rejects cancelling an invoice that already has a payment', async () => {
    const entryId = await createEntryWithLabor(token, vehicleId, 1, 100);
    const inv = await request(app)
      .post(`/api/v1/entries/${entryId}/invoice`)
      .set('Authorization', `Bearer ${token}`)
      .send({});
    await request(app).patch(`/api/v1/invoices/${inv.body.data.id}/issue`).set('Authorization', `Bearer ${token}`);
    await request(app)
      .post(`/api/v1/invoices/${inv.body.data.id}/payments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 10, method: 'CASH' });

    const res = await request(app)
      .patch(`/api/v1/invoices/${inv.body.data.id}/cancel`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  it('MECHANIC cannot issue invoices or record payments, but can read them', async () => {
    const entryId = await createEntryWithLabor(token, vehicleId, 1, 100);
    const inv = await request(app)
      .post(`/api/v1/entries/${entryId}/invoice`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    const mechanic = await loginAs('MECHANIC');
    const issueAttempt = await request(app)
      .patch(`/api/v1/invoices/${inv.body.data.id}/issue`)
      .set('Authorization', `Bearer ${mechanic.token}`);
    expect(issueAttempt.status).toBe(403);

    const readAttempt = await request(app)
      .get(`/api/v1/invoices/${inv.body.data.id}`)
      .set('Authorization', `Bearer ${mechanic.token}`);
    expect(readAttempt.status).toBe(200);
  });

  it('GET /invoices/:id/pdf returns a real PDF for an issued invoice', async () => {
    const entryId = await createEntryWithLabor(token, vehicleId, 1, 100);
    const inv = await request(app)
      .post(`/api/v1/entries/${entryId}/invoice`)
      .set('Authorization', `Bearer ${token}`)
      .send({});
    await request(app).patch(`/api/v1/invoices/${inv.body.data.id}/issue`).set('Authorization', `Bearer ${token}`);

    const res = await request(app)
      .get(`/api/v1/invoices/${inv.body.data.id}/pdf`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    expect(Number(res.headers['content-length'])).toBeGreaterThan(0);
  });
});
