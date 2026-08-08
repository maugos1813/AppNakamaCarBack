import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),

  // Neon Postgres: DATABASE_URL is the pooled (PgBouncer) connection used at runtime,
  // DIRECT_URL is the unpooled connection Prisma needs to run migrations.
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url(),

  // Comma-separated list of allowed frontend origins, e.g. "https://app.example.it,http://localhost:5173"
  CORS_ORIGIN: z.string().min(1),

  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters long.'),
  JWT_EXPIRES_IN: z.string().default('12h'),

  // Cloudflare R2 (S3-compatible object storage) for vehicle photos.
  R2_ACCOUNT_ID: z.string().min(1),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_BUCKET_NAME: z.string().min(1),
  R2_PUBLIC_URL: z.string().url(),

  // Resend (transactional email) for client notifications.
  RESEND_API_KEY: z.string().min(1),
  EMAIL_FROM: z.string().min(1),

  // Base URL of the (not-yet-built) client-facing frontend, used to build the
  // tracking/approval links embedded in notification emails, e.g.
  // `${FRONTEND_URL}/track/<token>`.
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),

  // Issuer details printed on invoice PDFs. Placeholders by default —
  // update these (Render env vars, no code change needed) with the real
  // business registration details before issuing real invoices.
  COMPANY_NAME: z.string().default('NakamaCar Carrozzeria Srl'),
  COMPANY_VAT_NUMBER: z.string().default('00000000000'),
  COMPANY_ADDRESS: z.string().default('Via Example 1'),
  COMPANY_CITY: z.string().default('Milano'),
  COMPANY_POSTAL_CODE: z.string().default('20100'),
  COMPANY_PROVINCE: z.string().default('MI'),
});

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment variables:\n${issues}`);
  }

  return parsed.data;
}

export const env = loadEnv();

export const isProduction = env.NODE_ENV === 'production';
export const isDevelopment = env.NODE_ENV === 'development';
