import jwt from 'jsonwebtoken';
import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../helpers/app';
import { resetDatabase } from '../helpers/db';
import { createUserWithRole } from '../helpers/auth';
import { env } from '../../src/config/env';

// `env` is parsed once at import time from .env.test, so SSO_SHARED_SECRET must
// already be set there for the "valid ticket" test below to actually exercise the
// success path — add e.g. SSO_SHARED_SECRET=test-sso-shared-secret to .env.test.
// Without it, verifySsoTicket() always throws (same as production with it unset),
// so that one test would fail while the rest (which test rejection) still pass.
const SHARED_SECRET = env.SSO_SHARED_SECRET ?? 'test-sso-shared-secret-not-used-in-prod';

function ticketFor(email: string, secret: string = SHARED_SECRET, options: jwt.SignOptions = { expiresIn: 60 }) {
  return jwt.sign({ email }, secret, options);
}

describe('Auth SSO', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('logs in an existing active user with a valid ticket, without a password', async () => {
    const { email } = await createUserWithRole('ADMIN');
    const res = await request(app).post('/api/v1/auth/sso').send({ ticket: ticketFor(email) });

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeTypeOf('string');
    expect(res.body.data.user.email).toBe(email);
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  it('rejects a ticket for an email with no account here (no auto-provisioning)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/sso')
      .send({ ticket: ticketFor('nobody@test.local') });

    expect(res.status).toBe(404);
  });

  it('rejects a deactivated user even with a valid ticket', async () => {
    const { email } = await createUserWithRole('ADMIN', { isActive: false });
    const res = await request(app).post('/api/v1/auth/sso').send({ ticket: ticketFor(email) });

    expect(res.status).toBe(404);
  });

  it('rejects a ticket signed with the wrong secret', async () => {
    const { email } = await createUserWithRole('ADMIN');
    const res = await request(app)
      .post('/api/v1/auth/sso')
      .send({ ticket: ticketFor(email, 'not-the-shared-secret') });

    expect(res.status).toBe(401);
  });

  it('rejects an expired ticket', async () => {
    const { email } = await createUserWithRole('ADMIN');
    const expired = jwt.sign({ email, iat: Math.floor(Date.now() / 1000) - 120 }, SHARED_SECRET, {
      expiresIn: -60,
    });
    const res = await request(app).post('/api/v1/auth/sso').send({ ticket: expired });

    expect(res.status).toBe(401);
  });

  it('rejects a malformed request body with 400', async () => {
    const res = await request(app).post('/api/v1/auth/sso').send({ ticket: 'too-short' });
    expect(res.status).toBe(400);
  });
});
