import type { FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { requireLogin } from './requireLogin.js';

export async function requireSuperAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  await requireLogin(request, reply);

  if (reply.sent) {
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: request.user.sub },
    select: { role: true },
  });

  if (!user || user.role !== 'SUPER_ADMIN') {
    return reply.code(403).send({
      ok: false,
      message: 'Forbidden: super admin access required',
    });
  }
}
