import express, { type Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import pinoHttp from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env';
import { logger } from './lib/logger';
import { apiRouter } from './routes';
import { notFoundHandler } from './middlewares/notFoundHandler';
import { errorHandler } from './middlewares/errorHandler';
import { globalRateLimiter } from './middlewares/rateLimit';
import { generateOpenApiDocument } from './lib/openapi/document';

const allowedOrigins = env.CORS_ORIGIN.split(',').map((origin) => origin.trim());

export function createApp(): Application {
  const app = express();

  app.disable('x-powered-by');

  app.use(helmet());
  app.use(
    cors({
      origin: allowedOrigins,
      credentials: true,
    }),
  );
  app.use(compression());
  // Logging goes before body parsing so req.log exists even for requests
  // that fail during parsing (e.g. malformed JSON) and reach errorHandler
  // without ever passing through express.json().
  app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === '/health' } }));
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
