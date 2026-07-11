import { v2 as cloudinary } from 'cloudinary';
import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { env } from '../config/env.js';
import { AppError } from '../utils/app-error.js';

export interface UploadResult {
  publicId: string;
  secureUrl: string;
}

export interface StorageService {
  uploadBuffer(file: Express.Multer.File, folder: string): Promise<UploadResult>;
  deleteAsset(publicId: string): Promise<void>;
}

interface CloudinaryProviderError {
  message?: string;
  http_code?: number;
}

const cloudinaryConfigurationErrorMessage =
  'Cloudinary credentials are invalid. Check CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.';
const localUploadPrefix = 'local:';
const localUploadRoot = path.join(process.cwd(), 'uploads');

const isCloudinaryProviderError = (error: unknown): error is CloudinaryProviderError =>
  typeof error === 'object' && error !== null;

const isCloudinaryConfigurationError = (error: unknown): boolean => {
  if (!isCloudinaryProviderError(error)) return false;
  const message = error.message?.toLowerCase() ?? '';
  return (
    error.http_code === 401 ||
    message.includes('invalid cloud_name') ||
    message.includes('unknown api key') ||
    message.includes('invalid signature')
  );
};

const canUseLocalFallback = (): boolean => env.NODE_ENV !== 'production';

const normalizeUploadFolder = (folder: string): string =>
  folder
    .split('/')
    .map((part) => part.replace(/[^a-zA-Z0-9_-]/g, ''))
    .filter(Boolean)
    .join('/');

const localUploadUrl = (relativePath: string): string =>
  `http://localhost:${env.PORT}/uploads/${relativePath}`;

if (env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
  });
}

export class CloudinaryStorageService implements StorageService {
  public async uploadBuffer(file: Express.Multer.File, folder: string): Promise<UploadResult> {
    if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
      if (canUseLocalFallback()) return this.uploadLocal(file, folder);
      throw new AppError('Cloudinary is not configured', 500);
    }

    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'auto',
          use_filename: true,
          unique_filename: true,
        },
        (error, result) => {
          if (error || !result) {
            if (isCloudinaryConfigurationError(error)) {
              if (canUseLocalFallback()) {
                void this.uploadLocal(file, folder).then(resolve).catch(reject);
                return;
              }
              reject(new AppError(cloudinaryConfigurationErrorMessage, 500));
              return;
            }
            reject(new AppError('File upload failed', 502));
            return;
          }
          resolve({ publicId: result.public_id, secureUrl: result.secure_url });
        },
      );
      stream.end(file.buffer);
    });
  }

  public async deleteAsset(publicId: string): Promise<void> {
    if (publicId.startsWith(localUploadPrefix)) {
      await this.deleteLocal(publicId);
      return;
    }
    if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
      throw new AppError('Cloudinary is not configured', 500);
    }
    try {
      await cloudinary.uploader.destroy(publicId, { resource_type: 'auto' });
    } catch (error) {
      if (isCloudinaryConfigurationError(error))
        throw new AppError(cloudinaryConfigurationErrorMessage, 500);
      throw new AppError('File deletion failed', 502);
    }
  }

  private async uploadLocal(file: Express.Multer.File, folder: string): Promise<UploadResult> {
    const normalizedFolder = normalizeUploadFolder(folder);
    const extension = path.extname(file.originalname).toLowerCase();
    const fileName = `${randomUUID()}${extension}`;
    const relativePath = path.posix.join(normalizedFolder, fileName);
    const targetDirectory = path.join(localUploadRoot, normalizedFolder);

    await mkdir(targetDirectory, { recursive: true });
    await writeFile(path.join(targetDirectory, fileName), file.buffer);

    return {
      publicId: `${localUploadPrefix}${relativePath}`,
      secureUrl: localUploadUrl(relativePath),
    };
  }

  private async deleteLocal(publicId: string): Promise<void> {
    const relativePath = publicId.slice(localUploadPrefix.length);
    const absolutePath = path.resolve(localUploadRoot, relativePath);
    if (!absolutePath.startsWith(localUploadRoot)) return;

    try {
      await unlink(absolutePath);
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return;
      throw new AppError('File deletion failed', 502);
    }
  }
}
