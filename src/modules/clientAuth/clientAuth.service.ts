import bcrypt from 'bcrypt';
import { ApiError } from '../../utils/ApiError';
import { env } from '../../config/env';
import { signClientSessionToken, verifyClientPortalSetupToken, buildClientPortalSetupUrl } from '../../lib/clientSessionToken';
import { sendEmail } from '../../lib/email';
import { logger } from '../../lib/logger';
import { clientsRepository, type ClientWithVehicles } from '../clients/clients.repository';
import { buildEmailHtml } from '../notifications/notifications.service';
import type { ClientForgotPasswordInput, ClientLoginInput, ClientSetPasswordInput } from './clientAuth.validation';

function toPublicClient(client: ClientWithVehicles) {
  const { passwordHash: _passwordHash, ...publicClient } = client;
  return publicClient;
}

export const clientAuthService = {
  async login(input: ClientLoginInput) {
    const client = await clientsRepository.findByEmail(input.email);

    // Same generic error whether the email doesn't match, isn't
    // portal-enabled, or has no password set yet — avoids leaking which
    // clients have a premium account.
    if (!client || !client.portalEnabled || !client.passwordHash) {
      throw ApiError.unauthorized('Invalid email or password.');
    }

    const isPasswordValid = await bcrypt.compare(input.password, client.passwordHash);
    if (!isPasswordValid) {
      throw ApiError.unauthorized('Invalid email or password.');
    }

    const full = await clientsRepository.findById(client.id);
    const accessToken = signClientSessionToken(client.id);
    return { accessToken, client: toPublicClient(full!) };
  },

  async setPassword(input: ClientSetPasswordInput) {
    let clientId: string;
    try {
      clientId = verifyClientPortalSetupToken(input.token);
    } catch {
      throw ApiError.badRequest('This link is invalid or has expired.');
    }

    const client = await clientsRepository.findById(clientId);
    if (!client || !client.portalEnabled) {
      throw ApiError.badRequest('This link is invalid or has expired.');
    }

    const passwordHash = await bcrypt.hash(input.password, env.BCRYPT_SALT_ROUNDS);
    await clientsRepository.update(client.id, { passwordHash });
  },

  async forgotPassword(input: ClientForgotPasswordInput) {
    const client = await clientsRepository.findByEmail(input.email);

    // Always the same response regardless of whether the email matches a
    // premium client — otherwise this endpoint enumerates accounts.
    if (!client || !client.portalEnabled) {
      return;
    }

    const setupUrl = buildClientPortalSetupUrl(client.id);

    try {
      await sendEmail(
        client.email!,
        'Reimposta la password del tuo account',
        buildEmailHtml(
          'Reimposta la password',
          'Hai richiesto di reimpostare la password del tuo account NakamaCar. Il link scade tra 48 ore. Se non sei stato tu, ignora questa email.',
          { url: setupUrl, label: 'Reimposta password' },
        ),
      );
    } catch (err) {
      logger.error({ err }, 'Failed to send client portal password reset email.');
    }
  },

  async getMe(clientId: string) {
    const client = await clientsRepository.findById(clientId);
    if (!client) {
      throw ApiError.notFound('Client not found.');
    }
    return toPublicClient(client);
  },
};
