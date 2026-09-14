export type ErrorCode =
  | 'UNAUTHENTICATED'
  | 'PERMISSION_DENIED'
  | 'NOT_FOUND'
  | 'VALIDATION_FAILED'
  | 'CONCURRENCY_CONFLICT'
  | 'IDEMPOTENCY_CONFLICT'
  | 'BUSINESS_RULE_VIOLATION'
  | 'INTERNAL_ERROR';

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly httpStatus: number;
  public readonly details?: Record<string, unknown>;
  public readonly retryable: boolean;

  constructor(
    code: ErrorCode,
    message: string,
    httpStatus = 400,
    details?: Record<string, unknown>,
    retryable = false
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.httpStatus = httpStatus;
    this.details = details;
    this.retryable = retryable;
    Object.setPrototypeOf(this, AppError.prototype);
  }

  static unauthorized(msg = 'Authentication required'): AppError {
    return new AppError('UNAUTHENTICATED', msg, 401);
  }

  static forbidden(msg = 'Access denied'): AppError {
    return new AppError('PERMISSION_DENIED', msg, 403);
  }

  static notFound(resource = 'Resource', id?: string): AppError {
    return new AppError(
      'NOT_FOUND',
      id ? `${resource} (${id}) not found` : `${resource} not found`,
      404
    );
  }

  static badRequest(msg: string, details?: Record<string, unknown>): AppError {
    return new AppError('VALIDATION_FAILED', msg, 400, details);
  }

  static conflict(msg: string, details?: Record<string, unknown>): AppError {
    return new AppError('CONCURRENCY_CONFLICT', msg, 409, details);
  }
}
