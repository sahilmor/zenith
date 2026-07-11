import multer from 'multer';
import path from 'node:path';
import { BadRequestError } from '../utils/app-error.js';

export const supportedAttachmentTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip',
  'application/x-zip-compressed',
]);

export const supportedAttachmentExtensions = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.pdf',
  '.docx',
  '.xlsx',
  '.pptx',
  '.zip',
]);

export const maxAttachmentSize = 10 * 1024 * 1024;

export const isSupportedAttachment = (
  file: Pick<Express.Multer.File, 'mimetype' | 'originalname'>,
): boolean => {
  if (supportedAttachmentTypes.has(file.mimetype)) return true;
  const extension = path.extname(file.originalname).toLowerCase();
  return (
    supportedAttachmentExtensions.has(extension) &&
    (file.mimetype === '' || file.mimetype === 'application/octet-stream')
  );
};

export const attachmentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxAttachmentSize, files: 1 },
  fileFilter: (_request, file, callback) => {
    if (!isSupportedAttachment(file)) {
      callback(new BadRequestError('Unsupported attachment type'));
      return;
    }
    callback(null, true);
  },
});
