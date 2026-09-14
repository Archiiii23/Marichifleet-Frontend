import { Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../errors.js';
import { logger } from '../logger.js';
import { AuthenticatedRequest } from '../types.js';

export function errorHandler(
  err: unknown,
  req: AuthenticatedRequest,
  res: Response,
  _next: NextFunction
) {
  const requestId = req.requestId || 'req_unknown';

  if (err instanceof AppError) {
    logger.warn({
      msg: err.message,
      code: err.code,
      requestId,
      status: err.httpStatus,
      path: req.path,
    });

    return res.status(err.httpStatus).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
        retryable: err.retryable,
      },
      requestId,
    });
  }

  if (err instanceof ZodError) {
    logger.warn({
      msg: 'Validation failed',
      code: 'VALIDATION_FAILED',
      issues: err.issues,
      requestId,
      path: req.path,
    });

    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_FAILED',
        message: 'Invalid request payload or query parameters',
        details: { issues: err.issues },
        retryable: false,
      },
      requestId,
    });
  }

  // Unhandled error
  logger.error({
    msg: 'Unhandled internal error',
    err,
    requestId,
    path: req.path,
  });

  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected internal error occurred. Our engineers have been notified.',
      retryable: true,
    },
    requestId,
  });
}
