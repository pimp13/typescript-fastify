import type { FastifyReply, FastifyRequest } from 'fastify';

export async function requireLogin(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    await request.jwtVerify();
  } catch {
    return reply.code(401).send({
      ok: false,
      message: 'Unauthorized',
    });
  }
}
