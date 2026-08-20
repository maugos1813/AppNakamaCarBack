import express, { type Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import pinoHttp from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import { env, isTest } from './config/env';
import { logger } from './lib/logger';
import { apiRouter } from './routes';
import { notFoundHandler } from './middlewares/notFoundHandler';
import { errorHandler } from './middlewares/errorHandler';
import { globalRateLimiter } from './middlewares/rateLimit';
import { generateOpenApiDocument } from './lib/openapi/document';

const allowedOrigins = env.CORS_ORIGIN.split(',').map((origin) => origin.trim());
// The `cors` package matches array entries against the browser's literal
// Origin header — "*" inside an array is just the four-character string "*"
// and never matches a real origin, so a true wildcard needs the bare string.
const corsOrigin = allowedOrigins.length === 1 && allowedOrigins[0] === '*' ? '*' : allowedOrigins;

export function createApp(): Application {
  const app = express();

  app.disable('x-powered-by');

  app.use(helmet());
  app.use(
    cors({
      origin: corsOrigin,
      // We authenticate with a Bearer JWT sent explicitly by the frontend
      // (never an ambient browser credential like a cookie), so CORS
      // "credentials" mode isn't needed — and it couldn't coexist with a
      // wildcard origin anyway: browsers hard-reject Access-Control-Allow-Origin: *
      // together with Access-Control-Allow-Credentials: true, no matter what
      // the server sends.
      credentials: false,
    }),
  );
  app.use(compression());
  // Logging goes before body parsing so req.log exists even for requests
  // that fail during parsing (e.g. malformed JSON) and reach errorHandler
  // without ever passing through express.json().
  // req.log still gets attached in tests (errorHandler relies on it existing)
  // — only the noisy per-request "request completed" line is switched off,
  // which would otherwise drown out the actual test runner output.
  app.use(pinoHttp({ logger, autoLogging: isTest ? false : { ignore: (req) => req.url === '/health' } }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.get('/health', (_req, res) => {
    res.status(200).json({
      success: true,
      message: 'Service is healthy.',
      data: { uptime: process.uptime(), timestamp: new Date().toISOString() },
    });
  });

  app.use('/api/v1', globalRateLimiter, apiRouter);

  const openApiDocument = generateOpenApiDocument();
  app.get('/api/docs.json', (_req, res) => res.json(openApiDocument));
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
