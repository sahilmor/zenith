import { pbkdf2, randomBytes, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const pbkdf2Async = promisify(pbkdf2);
const algorithm = 'sha512';
const iterations = 120_000;
const keyLength = 64;
const saltLength = 16;
const separator = '$';

export const hashPassword = async (password: string): Promise<string> => {
  const salt = randomBytes(saltLength).toString('base64url');
  const derivedKey = await pbkdf2Async(password, salt, iterations, keyLength, algorithm);
  return ['pbkdf2', algorithm, iterations, salt, derivedKey.toString('base64url')].join(separator);
};

export const verifyPassword = async (password: string, passwordHash: string): Promise<boolean> => {
  const [scheme, hashAlgorithm, iterationValue, salt, storedKey] = passwordHash.split(separator);
  if (scheme !== 'pbkdf2' || !hashAlgorithm || !iterationValue || !salt || !storedKey) return false;

  const parsedIterations = Number.parseInt(iterationValue, 10);
  if (!Number.isSafeInteger(parsedIterations) || parsedIterations <= 0) return false;

  const storedBuffer = Buffer.from(storedKey, 'base64url');
  const derivedKey = await pbkdf2Async(
    password,
    salt,
    parsedIterations,
    storedBuffer.length,
    hashAlgorithm,
  );

  return storedBuffer.length === derivedKey.length && timingSafeEqual(storedBuffer, derivedKey);
};
