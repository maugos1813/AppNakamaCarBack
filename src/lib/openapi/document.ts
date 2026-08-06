import { OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import { registry } from './registry';
import './paths'; // side-effectful: registers every endpoint on import

export function generateOpenApiDocument() {
  const generator = new OpenApiGeneratorV3(registry.definitions);

  return generator.generateDocument({
    openapi: '3.0.0',
    info: {
      title: 'Carrozzeria NakamaCar API',
      version: '1.0.0',
      description:
        'Backend API for a Carrozzeria (auto body repair shop) management system. ' +
        'All endpoints are prefixed with /api/v1. Authenticate with POST /auth/login, ' +
        'then send the returned accessToken as "Authorization: Bearer <token>".',
    },
  });
}
