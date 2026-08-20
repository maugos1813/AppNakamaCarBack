import dotenv from 'dotenv';

// Loaded before any test file's imports run, so when src/config/env.ts later
// does `import 'dotenv/config'` (which loads .env without overriding already-set
// vars), these test values win — the app under test talks to the test database.
dotenv.config({ path: '.env.test' });

import { vi } from 'vitest';

// Never hit the real Resend API from a test run — no real inboxes get spammed,
// no quota gets burned, and tests don't depend on network/provider uptime.
// This is the one deliberate exception to "test against reality": it applies
// to a paid third-party side effect, not to our own code or the database.
vi.mock('../src/lib/email', () => ({
  sendEmail: vi.fn().mockResolvedValue('test-provider-message-id'),
}));
