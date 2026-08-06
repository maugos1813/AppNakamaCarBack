import type { Request, Response } from 'express';
import { ApiError } from '../../utils/ApiError';
import { sendSuccess } from '../../utils/ApiResponse';
import { photosService } from './photos.service';
import { uploadPhotoSchema } from './photos.validation';

export const photosController = {
  async list(req: Request, res: Response) {
    const photos = await photosService.listByEntry(req.params.entryId as string);
    sendSuccess(res, { message: 'Photos retrieved successfully.', data: photos });
  },

  async upload(req: Request, res: Response) {
    if (!req.file) {
      throw ApiError.badRequest('Photo file is required (field name: "photo").');
    }

    const input = uploadPhotoSchema.parse(req.body);
    const photo = await photosService.uploadPhoto(
      req.params.entryId as string,
      input,
      req.file,
      req.user!.id,
    );
    sendSuccess(res, { statusCode: 201, message: 'Photo uploaded successfully.', data: photo });
  },

  async remove(req: Request, res: Response) {
    await photosService.deletePhoto(req.params.id as string);
    sendSuccess(res, { message: 'Photo deleted successfully.' });
  },
};
