import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../helpers/app';
import { prisma, resetDatabase } from '../helpers/db';
import { createUserWithRole, loginAs } from '../helpers/auth';

describe('Auth', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('logs in with valid credentials and never leaks the password hash', async () => {
    const { email, password } = await createUserWithRole('ADMIN');
    const res = await request(app).post('/api/v1/auth/login').send({ email, password });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeTypeOf('string');
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  it('rejects a wrong password with a generic message', async () => {
    const { email } = await createUserWithRole('ADMIN');
    const res = await request(app).post('/api/v1/auth/login').send({ email, password: 'wrong-password' });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid email or password.');
  });

  it('rejects a nonexistent email with the exact same message (no user enumeration)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'nobody@test.local', password: 'whatever' });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid email or password.');
  });

  it('rejects a deactivated user even with the correct password', async () => {
    const { email, password } = await createUserWithRole('ADMIN', { isActive: false });
    const res = await request(app).post('/api/v1/auth/login').send({ email, password });

    expect(res.status).toBe(401);
  });

  it('rejects malformed login payloads with a 400 and field-level errors', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ email: 'not-an-email' });

    expect(res.status).toBe(400);
    expect(res.body.errors.length).toBeGreaterThan(0);
  });

  it('GET /auth/me requires a token', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('GET /auth/me returns the authenticated user profile', async () => {
    const { token, email } = await loginAs('ADMIN');
    const res = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe(email);
    expect(res.body.data.role.name).toBe('ADMIN');
  });

  it('revokes access immediately when the user is deactivated mid-session', async () => {
    const { token, userId } = await loginAs('MECHANIC');

    await prisma.user.update({ where: { id: userId }, data: { isActive: false } });

    const res = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
  });
});
