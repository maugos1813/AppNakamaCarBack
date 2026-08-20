import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../helpers/app';
import { resetDatabase } from '../helpers/db';
import { loginAs } from '../helpers/auth';
import { createClient } from '../helpers/fixtures';

describe('Clients', () => {
  let token: string;

  beforeEach(async () => {
    await resetDatabase();
    ({ token } = await loginAs('ADMIN'));
  });

  it('creates a private individual without company fields', async () => {
    const res = await request(app)
      .post('/api/v1/clients')
      .set('Authorization', `Bearer ${token}`)
      .send({ fullName: 'Mario Rossi', phone: '3331234567' });

    expect(res.status).toBe(201);
    expect(res.body.data.isCompany).toBe(false);
  });

  it('rejects a company client with no vatNumber', async () => {
    const res = await request(app)
      .post('/api/v1/clients')
      .set('Authorization', `Bearer ${token}`)
      .send({ isCompany: true, fullName: 'Rappresentante', phone: '3331234567' });

    expect(res.status).toBe(400);
  });

  it('rejects a duplicate fiscalCode with 409', async () => {
    const body = { fullName: 'Cliente Uno', phone: '3330000001', fiscalCode: 'BNCGLI85M50H501Z' };
    await request(app).post('/api/v1/clients').set('Authorization', `Bearer ${token}`).send(body);
    const second = await request(app)
      .post('/api/v1/clients')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...body, fullName: 'Cliente Dos', phone: '3330000002' });

    expect(second.status).toBe(409);
  });

  it('DELETE is rejected for MECHANIC but allowed for ADMIN', async () => {
    const client = await createClient();
    const mechanic = await loginAs('MECHANIC');

    const asMechanic = await request(app)
      .delete(`/api/v1/clients/${client.id}`)
      .set('Authorization', `Bearer ${mechanic.token}`);
    expect(asMechanic.status).toBe(403);

    const asAdmin = await request(app).delete(`/api/v1/clients/${client.id}`).set('Authorization', `Bearer ${token}`);
    expect(asAdmin.status).toBe(200);
  });

  it('DELETE is rejected once the client has a vehicle (Restrict constraint)', async () => {
    const client = await createClient();
    await request(app)
      .post('/api/v1/vehicles')
      .set('Authorization', `Bearer ${token}`)
      .send({ clientId: client.id, licensePlate: 'AB123CD', make: 'Fiat', model: 'Panda' });

    const res = await request(app).delete(`/api/v1/clients/${client.id}`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(409);
  });
});

describe('Vehicles', () => {
  let token: string;

  beforeEach(async () => {
    await resetDatabase();
    ({ token } = await loginAs('ADMIN'));
  });

  it('normalizes the license plate to uppercase', async () => {
    const client = await createClient();
    const res = await request(app)
      .post('/api/v1/vehicles')
      .set('Authorization', `Bearer ${token}`)
      .send({ clientId: client.id, licensePlate: 'fl123gh', make: 'Fiat', model: 'Tipo' });

    expect(res.status).toBe(201);
    expect(res.body.data.licensePlate).toBe('FL123GH');
  });

  it('rejects an unknown clientId with 400', async () => {
    const res = await request(app)
      .post('/api/v1/vehicles')
      .set('Authorization', `Bearer ${token}`)
      .send({ clientId: 'does-not-exist', licensePlate: 'AB999CD', make: 'Fiat', model: '500' });

    expect(res.status).toBe(400);
  });

  it('rejects an invalid fuelType', async () => {
    const client = await createClient();
    const res = await request(app)
      .post('/api/v1/vehicles')
      .set('Authorization', `Bearer ${token}`)
      .send({ clientId: client.id, licensePlate: 'XY111ZZ', make: 'Fiat', model: '500', fuelType: 'NUCLEAR' });

    expect(res.status).toBe(400);
  });
});
