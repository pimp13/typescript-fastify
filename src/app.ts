import Fastify, { FastifyReply, FastifyRequest } from 'fastify';
import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import healthRoutes from './routes/health.js';
import usersRoutes from './modules/users/users.routes.js';
import authRoutes from './modules/auth/auth.routes.js';

export function buildApp() {
  const app = Fastify({
    logger: true,
  });

  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error('JWT_SECRET environment variable is required');
  }

  app.register(cookie);
  app.register(jwt, {
    secret: jwtSecret,
    cookie: {
      cookieName: 'token',
      signed: false,
    },
  });

  app.register(healthRoutes, { prefix: '/api' });
  app.register(authRoutes, { prefix: '/api/auth' });
  app.register(usersRoutes, { prefix: '/api/users' });

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
