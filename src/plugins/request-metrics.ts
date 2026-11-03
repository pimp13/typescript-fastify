import type { FastifyPluginAsync } from 'fastify';
import { recordRequest } from '../modules/monitoring/metrics.collector.js';

const requestMetricsPlugin: FastifyPluginAsync = async (app) => {
  app.addHook('onRequest', async (request) => {
    (request as typeof request & { metricsStartedAt?: bigint }).metricsStartedAt =
      process.hrtime.bigint();
  });

  app.addHook('onResponse', async (request, reply) => {
    const startedAt = (
      request as typeof request & { metricsStartedAt?: bigint }
    ).metricsStartedAt;

    if (!startedAt) return;

    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const route =
      (typeof request.routeOptions?.url === 'string'
        ? request.routeOptions.url
        : request.url.split('?')[0]) || 'unknown';

    recordRequest({
      durationMs: Number(durationMs.toFixed(2)),
      statusCode: reply.statusCode,
      method: request.method,
      route,
    });
  });
};

export default requestMetricsPlugin;
