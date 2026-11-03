import { join } from 'node:path';
import Fastify, { FastifyReply, FastifyRequest } from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import healthRoutes from './routes/health.js';
import usersRoutes from './modules/users/users.routes.js';
import authRoutes from './modules/auth/auth.routes.js';
import monitoringRoutes from './modules/monitoring/monitoring.routes.js';
import chanRoutes from './modules/chan/chan.routes.js';
import chanAdminRoutes from './modules/chan/chan.admin.routes.js';
import requestMetricsPlugin from './plugins/request-metrics.js';

export function buildApp() {
  const app = Fastify({
    logger: true,
  });

  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error('JWT_SECRET environment variable is required');
  }

  app.register(cors, {
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3001',
    credentials: true,
  });

  app.register(cookie);
  app.register(jwt, {
    secret: jwtSecret,
    cookie: {
      cookieName: '__token_auth__',
      signed: false,
    },
  });
  app.register(multipart, {
    limits: {
      fileSize: 20 * 1024 * 1024,
      files: 1,
    },
  });
  app.register(fastifyStatic, {
    root: join(process.cwd(), 'uploads'),
    prefix: '/uploads/',
    decorateReply: false,
  });

  app.register(requestMetricsPlugin);

  app.register(healthRoutes, { prefix: '/api' });
  app.register(authRoutes, { prefix: '/api/auth' });
  app.register(usersRoutes, { prefix: '/api/users' });
  app.register(monitoringRoutes, { prefix: '/api/monitoring' });
  app.register(chanRoutes, { prefix: '/api/chan' });
  app.register(chanAdminRoutes, { prefix: '/api/admin/chan' });

  app.setNotFoundHandler((request, reply) => {
    return reply.code(404).send({
      ok: false,
      message: `Route ${request.method} ${request.url} not found`,
    });
  });

  app.setErrorHandler((error: any, request: FastifyRequest, reply: FastifyReply) => {
    request.log.error(error);

    return reply.code(error.statusCode ?? 500).send({
      ok: false,
      message: error.statusCode ? error.message : 'Internal Server Error',
    });
  });

  return app;
}
