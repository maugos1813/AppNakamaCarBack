import multer from 'multer';
import { ApiError } from '../utils/ApiError';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (_req, file, callback) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      callback(ApiError.badRequest(`Unsupported file type: ${file.mimetype}. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}.`));
      return;
    }
    callback(null, true);
  },
});

// Payment receipts: a client-supplied bank transfer screenshot or a PDF
// export from their banking app, so — unlike vehicle photos — PDF has to be
// accepted alongside images.
const ALLOWED_RECEIPT_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_RECEIPT_FILE_SIZE_BYTES = 15 * 1024 * 1024;

export const uploadReceipt = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_RECEIPT_FILE_SIZE_BYTES },
  fileFilter: (_req, file, callback) => {
    if (!ALLOWED_RECEIPT_MIME_TYPES.includes(file.mimetype)) {
      callback(
        ApiError.badRequest(`Unsupported file type: ${file.mimetype}. Allowed: ${ALLOWED_RECEIPT_MIME_TYPES.join(', ')}.`),
      );
      return;
    }
    callback(null, true);
  },
});
