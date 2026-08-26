import rateLimit from 'express-rate-limit';
import type { Request, Response } from 'express';
import { isTest } from '../config/env';

function tooManyRequestsHandler(_req: Request, res: Response) {
  res.status(429).json({
    success: false,
    message: 'Too many requests. Please try again later.',
    errors: [],
  });
}

// Real client traffic never runs with NODE_ENV=test (Render always sets
// production), so skipping enforcement there only affects the automated
// test suite — which logs in far more than 5 times per run by design.
const skip = () => isTest;

// Generous global ceiling — this protects against abuse/scraping, not
// legitimate internal usage by a handful of staff members.
export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip,
  handler: tooManyRequestsHandler,
});

// Much stricter — shared by every unauthenticated endpoint in the API
// (staff login/password-reset, premium-client login/password-reset), the
// only targets for brute-forcing or account enumeration.
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skip,
  handler: tooManyRequestsHandler,
});
