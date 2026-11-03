import type { FastifyPluginAsync } from 'fastify';
import { request } from 'http';

const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async (request, reply) => {
    return reply.code(200).send({
      ok: true,
      message: 'API is running',
      data: {
        uptime: process.uptime(),
        ip: request.ip,
        time: new Date(),
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        userAgent: request.headers['user-agent'],
      }
    })
  });

  app.get('/health', async () => ({
    ok: true,
    message: 'API is running',
    data: {
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    },
  }));
};

export default healthRoutes;
