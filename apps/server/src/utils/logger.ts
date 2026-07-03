import { env } from '../config/env.js';

type LogMeta = Record<string, unknown>;

const serializeMeta = (meta?: LogMeta): string => {
  if (!meta || Object.keys(meta).length === 0) return '';
  return ` ${JSON.stringify(meta)}`;
};

const write = (
  level: 'info' | 'warn' | 'error' | 'debug',
  message: string,
  meta?: LogMeta,
): void => {
  if (level === 'debug' && env.NODE_ENV === 'production') return;
  const line =
    env.NODE_ENV === 'production'
      ? JSON.stringify({ level, message, ...meta, timestamp: new Date().toISOString() })
      : `[${level.toUpperCase()}] ${message}${serializeMeta(meta)}`;

  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.info(line);
};

export const logger = {
  info: (message: string, meta?: LogMeta) => write('info', message, meta),
  warn: (message: string, meta?: LogMeta) => write('warn', message, meta),
  error: (message: string, meta?: LogMeta) => write('error', message, meta),
  debug: (message: string, meta?: LogMeta) => write('debug', message, meta),
};
