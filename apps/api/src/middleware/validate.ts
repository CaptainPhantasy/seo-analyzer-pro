/**
 * SEO Analyzer Pro - Enterprise SEO & GEO Analysis Platform
 * Copyright (c) 2026 Legacy AI / Floyd's Labs
 * www.LegacyAI.space | www.FloydsLabs.com
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { ZodType, ZodError } from 'zod';
import { fromError } from 'zod-validation-error';

/**
 * Validation middleware factory for request body
 */
export function validateBody<T>(schema: ZodType<T>) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    try {
      request.body = schema.parse(request.body);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromError(error);

        return reply.status(400).send({
          success: false,
          error: {
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            statusCode: 400,
            details: error.errors.map((err) => ({
              field: err.path.join('.'),
              message: err.message,
              code: err.code,
            })),
            humanMessage: validationError.toString(),
          },
        });
      }
      throw error;
    }
  };
}

/**
 * Validation middleware factory for query parameters
 */
export function validateQuery<T>(schema: ZodType<T>) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    try {
      request.query = schema.parse(request.query) as Record<string, string>;
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromError(error);

        return reply.status(400).send({
          success: false,
          error: {
            message: 'Query validation failed',
            code: 'QUERY_VALIDATION_ERROR',
            statusCode: 400,
            details: error.errors.map((err) => ({
              field: err.path.join('.'),
              message: err.message,
              code: err.code,
            })),
            humanMessage: validationError.toString(),
          },
        });
      }
      throw error;
    }
  };
}

/**
 * Validation middleware factory for URL parameters
 */
export function validateParams<T>(schema: ZodType<T>) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    try {
      request.params = schema.parse(request.params) as Record<string, string>;
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromError(error);

        return reply.status(400).send({
          success: false,
          error: {
            message: 'Parameter validation failed',
            code: 'PARAM_VALIDATION_ERROR',
            statusCode: 400,
            details: error.errors.map((err) => ({
              field: err.path.join('.'),
              message: err.message,
              code: err.code,
            })),
            humanMessage: validationError.toString(),
          },
        });
      }
      throw error;
    }
  };
}

/**
 * Combined validation for body, query, and params
 */
export function validate<TBody, TQuery, TParams>(config: {
  body?: ZodType<TBody>;
  query?: ZodType<TQuery>;
  params?: ZodType<TParams>;
}) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const errors: Array<{ location: string; field: string; message: string; code: string }> = [];

    // Validate body
    if (config.body && request.body) {
      try {
        request.body = config.body.parse(request.body);
      } catch (error) {
        if (error instanceof ZodError) {
          errors.push(
            ...error.errors.map((err) => ({
              location: 'body',
              field: err.path.join('.'),
              message: err.message,
              code: err.code,
            }))
          );
        }
      }
    }

    // Validate query
    if (config.query && request.query) {
      try {
        request.query = config.query.parse(request.query) as Record<string, string>;
      } catch (error) {
        if (error instanceof ZodError) {
          errors.push(
            ...error.errors.map((err) => ({
              location: 'query',
              field: err.path.join('.'),
              message: err.message,
              code: err.code,
            }))
          );
        }
      }
    }

    // Validate params
    if (config.params && request.params) {
      try {
        request.params = config.params.parse(request.params) as Record<string, string>;
      } catch (error) {
        if (error instanceof ZodError) {
          errors.push(
            ...error.errors.map((err) => ({
              location: 'params',
              field: err.path.join('.'),
              message: err.message,
              code: err.code,
            }))
          );
        }
      }
    }

    // Return errors if any
    if (errors.length > 0) {
      return reply.status(400).send({
        success: false,
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          statusCode: 400,
          details: errors,
        },
      });
    }
  };
}

/**
 * Sanitize input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validate and sanitize URL
 */
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
