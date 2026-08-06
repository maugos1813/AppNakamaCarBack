import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { ApiError } from '../../utils/ApiError';
import { uploadToR2, deleteFromR2 } from '../../lib/r2';
import { entriesRepository } from '../entries/entries.repository';
import { photosRepository } from './photos.repository';
import type { UploadPhotoInput } from './photos.validation';

const MAX_WIDTH_PX = 2000;
const WEBP_QUALITY = 80;

export const photosService = {
  async listByEntry(vehicleEntryId: string) {
    const entry = await entriesRepository.findById(vehicleEntryId);
    if (!entry) {
      throw ApiError.notFound('Vehicle entry not found.');
    }
    return photosRepository.findByEntryId(vehicleEntryId);
  },

  async uploadPhoto(
    vehicleEntryId: string,
    input: UploadPhotoInput,
    file: Express.Multer.File,
    uploadedByUserId: string,
  ) {
    const entry = await entriesRepository.findById(vehicleEntryId);
    if (!entry) {
      throw ApiError.notFound('Vehicle entry not found.');
    }

    const { data, info } = await sharp(file.buffer)
      .rotate() // apply EXIF orientation before it gets stripped by re-encoding
      .resize({ width: MAX_WIDTH_PX, withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer({ resolveWithObject: true });

    const storageKey = `vehicle-entries/${vehicleEntryId}/${randomUUID()}.webp`;
    const url = await uploadToR2(storageKey, data, 'image/webp');

    return photosRepository.create({
      vehicleEntryId,
      url,
      storageKey,
      category: input.category,
      caption: input.caption,
      width: info.width,
      height: info.height,
      sizeBytes: info.size,
      uploadedByUserId,
    });
  },

  async deletePhoto(id: string) {
    const photo = await photosRepository.findById(id);
    if (!photo) {
      throw ApiError.notFound('Photo not found.');
    }
    await deleteFromR2(photo.storageKey);
    await photosRepository.delete(id);
  },
};
