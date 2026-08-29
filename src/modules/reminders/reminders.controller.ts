import type { Request, Response } from 'express';
import { sendSuccess } from '../../utils/ApiResponse';
import { remindersService } from './reminders.service';

export const remindersController = {
  async run(req: Request, res: Response) {
    const dryRun = req.query.dryRun === 'true';
    const result = await remindersService.run({ dryRun });
    sendSuccess(res, { message: 'Reminders run completed.', data: result });
  },
};
