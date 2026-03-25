/**
 * SEO Analyzer Pro - Enterprise SEO & GEO Analysis Platform
 * Copyright (c) 2026 Legacy AI / Floyd's Labs
 * www.LegacyAI.space | www.FloydsLabs.com
 */

import { FastifyRequest, FastifyReply, HookHandlerDoneFunction } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';

// Extend FastifyRequest to include user
declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string;
      email: string;
      role: string;
      orgId: string;
    };
  }
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  orgId: string;
  iat: number;
  exp: number;
}

/**
 * Authentication middleware using JWT
 */
export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    // Try to get token from cookie first, then from Authorization header
    let token: string | undefined;

    // Check cookie
    token = request.cookies.token;

    // Check Authorization header if no cookie
    if (!token) {
      const authHeader = request.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      return reply.status(401).send({
        success: false,
        error: {
          message: 'Authentication required',
          code: 'UNAUTHORIZED',
          statusCode: 401,
        },
      });
    }

    // Verify JWT
    const decoded = await request.server.jwt.verify<JWTPayload>(token);

    // Fetch user from database to ensure they still exist and are valid
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
        orgId: true,
      },
    });

    if (!user) {
      return reply.status(401).send({
        success: false,
        error: {
          message: 'User not found',
          code: 'USER_NOT_FOUND',
          statusCode: 401,
        },
      });
    }

    // Attach user to request
    request.user = user;
  } catch (error) {
    logger.warn({ error }, 'Authentication failed');

    return reply.status(401).send({
      success: false,
      error: {
        message: 'Invalid or expired token',
        code: 'INVALID_TOKEN',
        statusCode: 401,
      },
    });
  }
}

/**
 * Optional authentication - doesn't fail if no token
 */
export async function optionalAuthMiddleware(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  try {
    let token: string | undefined = request.cookies.token;

    if (!token) {
      const authHeader = request.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (token) {
      const decoded = await request.server.jwt.verify<JWTPayload>(token);
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          role: true,
          orgId: true,
        },
      });

      if (user) {
        request.user = user;
      }
    }
  } catch {
    // Silently ignore - optional auth
  }
}

/**
 * Role-based authorization middleware
 */
export function requireRole(...allowedRoles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    if (!request.user) {
      return reply.status(401).send({
        success: false,
        error: {
          message: 'Authentication required',
          code: 'UNAUTHORIZED',
          statusCode: 401,
        },
      });
    }

    if (!allowedRoles.includes(request.user.role)) {
      return reply.status(403).send({
        success: false,
        error: {
          message: 'Insufficient permissions',
          code: 'FORBIDDEN',
          statusCode: 403,
        },
      });
    }
  };
}

/**
 * Organization ownership middleware
 */
export async function requireOrgAccess(
  request: FastifyRequest<{ Params: { orgId?: string } }>,
  reply: FastifyReply
): Promise<void> {
  if (!request.user) {
    return reply.status(401).send({
      success: false,
      error: {
        message: 'Authentication required',
        code: 'UNAUTHORIZED',
        statusCode: 401,
      },
    });
  }

  const orgId = request.params.orgId || request.user.orgId;

  if (request.user.orgId !== orgId && request.user.role !== 'OWNER') {
    return reply.status(403).send({
      success: false,
      error: {
        message: 'Access to this organization is denied',
        code: 'ORG_ACCESS_DENIED',
        statusCode: 403,
      },
    });
  }
}

/**
 * API Key authentication middleware
 */
export async function apiKeyMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const apiKey = request.headers['x-api-key'] as string | undefined;

    if (!apiKey) {
      return reply.status(401).send({
        success: false,
        error: {
          message: 'API key required',
          code: 'API_KEY_REQUIRED',
          statusCode: 401,
        },
      });
    }

    // Hash the API key to compare with stored hash
    const keyRecord = await prisma.apiKey.findUnique({
      where: { key: apiKey },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            orgId: true,
          },
        },
      },
    });

    if (!keyRecord || !keyRecord.enabled) {
      return reply.status(401).send({
        success: false,
        error: {
          message: 'Invalid API key',
          code: 'INVALID_API_KEY',
          statusCode: 401,
        },
      });
    }

    // Check expiration
    if (keyRecord.expiresAt && keyRecord.expiresAt < new Date()) {
      return reply.status(401).send({
        success: false,
        error: {
          message: 'API key has expired',
          code: 'API_KEY_EXPIRED',
          statusCode: 401,
        },
      });
    }

    // Update last used timestamp
    await prisma.apiKey.update({
      where: { id: keyRecord.id },
      data: { lastUsed: new Date() },
    });

    // Attach user to request
    request.user = keyRecord.user;
  } catch (error) {
    logger.error({ error }, 'API key authentication failed');

    return reply.status(401).send({
      success: false,
      error: {
        message: 'API key authentication failed',
        code: 'API_KEY_AUTH_FAILED',
        statusCode: 401,
      },
    });
  }
}
