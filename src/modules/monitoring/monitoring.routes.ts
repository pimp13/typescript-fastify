import type { FastifyPluginAsync } from 'fastify';
import { requireSuperAdmin } from '../../hooks/requireSuperAdmin.js';
import { getMonitoringSnapshot } from './monitoring.service.js';

const STREAM_INTERVAL_MS = 2_000;

const monitoringRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireSuperAdmin);

  app.get('/overview', async () => {
    const snapshot = await getMonitoringSnapshot();

    return {
      ok: true,
      message: 'Monitoring snapshot fetched successfully',
      data: snapshot,
    };
  });

  app.get('/stream', async (request, reply) => {
    reply.hijack();

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Access-Control-Allow-Origin':
        process.env.CORS_ORIGIN ?? 'http://localhost:3001',
      'Access-Control-Allow-Credentials': 'true',
    });

    reply.raw.write(': connected\n\n');

    let closed = false;

    const push = async () => {
      if (closed) return;

      try {
        const snapshot = await getMonitoringSnapshot();
        reply.raw.write(`event: monitoring\n`);
        reply.raw.write(`data: ${JSON.stringify(snapshot)}\n\n`);
      } catch (error) {
        request.log.error(error);
        reply.raw.write(
          `event: error\ndata: ${JSON.stringify({ message: 'Failed to collect metrics' })}\n\n`,
        );
      }
    };

    await push();
    const timer = setInterval(() => {
      void push();
    }, STREAM_INTERVAL_MS);

    const cleanup = () => {
      if (closed) return;
      closed = true;
      clearInterval(timer);
    };

    request.raw.on('close', cleanup);
    request.raw.on('error', cleanup);
  });
};

export default monitoringRoutes;
