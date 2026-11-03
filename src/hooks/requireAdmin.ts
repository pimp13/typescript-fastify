import type { FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { requireLogin } from './requireLogin.js';

const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'ADMIN_GENERAL']);

export async function requireAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  await requireLogin(request, reply);

  if (reply.sent) {
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: request.user.sub },
    select: { role: true, isActive: true },
  });

  if (!user || !user.isActive || !ADMIN_ROLES.has(user.role)) {
    return reply.code(403).send({
      ok: false,
      message: 'Forbidden: admin access required',
    });
  }
}
