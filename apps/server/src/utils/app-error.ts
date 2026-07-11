export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly errors: unknown[] | null;

  public constructor(
    message: string,
    statusCode = 500,
    errors: unknown[] | null = null,
    isOperational = true,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  public constructor(message = 'Bad request', errors: unknown[] | null = null) {
    super(message, 400, errors);
  }
}
export class UnauthorizedError extends AppError {
  public constructor(message = 'Unauthorized') {
    super(message, 401);
  }
}
export class ForbiddenError extends AppError {
  public constructor(message = 'Forbidden') {
    super(message, 403);
  }
}
export class ConflictError extends AppError {
  public constructor(message = 'Conflict') {
    super(message, 409);
  }
}
export class NotFoundError extends AppError {
  public constructor(message = 'Resource not found') {
    super(message, 404);
  }
}
