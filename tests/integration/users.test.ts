import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../helpers/app';
import { prisma, resetDatabase } from '../helpers/db';
import { loginAs } from '../helpers/auth';

describe('Users', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('ADMIN can list users, MECHANIC gets 403', async () => {
    const admin = await loginAs('ADMIN');
    await loginAs('MECHANIC');

    const asAdmin = await request(app).get('/api/v1/users').set('Authorization', `Bearer ${admin.token}`);
    expect(asAdmin.status).toBe(200);
    expect(asAdmin.body.data.items.length).toBeGreaterThanOrEqual(2);

    const mechanic = await loginAs('MECHANIC');
    const asMechanic = await request(app).get('/api/v1/users').set('Authorization', `Bearer ${mechanic.token}`);
    expect(asMechanic.status).toBe(403);
  });

  it('ADMIN can create a new staff user with a role', async () => {
    const admin = await loginAs('ADMIN');
    const role = await prisma.role.upsert({ where: { name: 'MECHANIC' }, update: {}, create: { name: 'MECHANIC' } });

    const res = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ fullName: 'Nuovo Meccanico', email: 'nuovo@test.local', password: 'StrongPass1', roleId: role.id });

    expect(res.status).toBe(201);
    expect(res.body.data.email).toBe('nuovo@test.local');
    expect(res.body.data.passwordHash).toBeUndefined();
  });

  it('rejects creating a user with a duplicate email', async () => {
    const admin = await loginAs('ADMIN');
    const role = await prisma.role.upsert({ where: { name: 'MECHANIC' }, update: {}, create: { name: 'MECHANIC' } });
    const body = { fullName: 'Dup', email: 'dup@test.local', password: 'StrongPass1', roleId: role.id };

    await request(app).post('/api/v1/users').set('Authorization', `Bearer ${admin.token}`).send(body);
    const second = await request(app).post('/api/v1/users').set('Authorization', `Bearer ${admin.token}`).send(body);

    expect(second.status).toBe(409);
  });

  it('any authenticated user can update their own profile', async () => {
    const mechanic = await loginAs('MECHANIC');
    const res = await request(app)
      .patch('/api/v1/users/me')
      .set('Authorization', `Bearer ${mechanic.token}`)
      .send({ fullName: 'Nome Aggiornato' });

    expect(res.status).toBe(200);
    expect(res.body.data.fullName).toBe('Nome Aggiornato');
  });

  it('rejects changing own password with a wrong current password', async () => {
    const mechanic = await loginAs('MECHANIC');
    const res = await request(app)
      .patch('/api/v1/users/me/password')
      .set('Authorization', `Bearer ${mechanic.token}`)
      .send({ currentPassword: 'wrong', newPassword: 'NewStrongPass1' });

    expect(res.status).toBe(400);
  });

  it('changes own password with the correct current password, old password stops working', async () => {
    const mechanic = await loginAs('MECHANIC', { password: 'OldPass123' });

    const changeRes = await request(app)
      .patch('/api/v1/users/me/password')
      .set('Authorization', `Bearer ${mechanic.token}`)
      .send({ currentPassword: 'OldPass123', newPassword: 'NewPass456' });
    expect(changeRes.status).toBe(200);

    const oldLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: mechanic.email, password: 'OldPass123' });
    expect(oldLogin.status).toBe(401);

    const newLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: mechanic.email, password: 'NewPass456' });
    expect(newLogin.status).toBe(200);
  });
});
