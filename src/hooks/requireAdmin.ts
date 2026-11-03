import { FastifyReply, FastifyRequest } from "fastify";
import { requireLogin } from "./requireLogin.js";
import { prisma } from "../lib/prisma.js";

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
    select: { role: true, isActive: true }
  });

  if (!user || user.role !== 'ADMIN_GENERAL' || !user.isActive) {
    return reply.code(403).send({
      ok: false,
      message: 'Forbidden: admin access required',
    });
  }
}