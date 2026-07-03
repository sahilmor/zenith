import type { Response } from 'express';

export interface ApiResponse<TData = unknown> {
  success: boolean;
  message: string;
  data: TData | null;
  errors: unknown[] | null;
  timestamp: string;
}

const createResponse = <TData>(
  success: boolean,
  message: string,
  data: TData | null,
  errors: unknown[] | null,
): ApiResponse<TData> => ({
  success,
  message,
  data,
  errors,
  timestamp: new Date().toISOString(),
});

export const sendSuccess = <TData>(
  response: Response,
  statusCode: number,
  message: string,
  data: TData | null = null,
): Response => response.status(statusCode).json(createResponse(true, message, data, null));

export const sendError = (
  response: Response,
  statusCode: number,
  message: string,
  errors: unknown[] | null = null,
): Response => response.status(statusCode).json(createResponse(false, message, null, errors));
