import { deviceTokensRepository } from './deviceTokens.repository';
import type { RegisterDeviceTokenInput } from './deviceTokens.validation';

export const deviceTokensService = {
  registerToken(userId: string, input: RegisterDeviceTokenInput) {
    return deviceTokensRepository.upsert(input.token, {
      token: input.token,
      platform: input.platform,
      userId,
    });
  },
};
