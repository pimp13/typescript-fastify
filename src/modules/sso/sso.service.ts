import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { Prisma, Role } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import type { SsoUserInfo } from './sso.types.js';

const userPublicSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  lastLogin: true,
  createdAt: true,
  updatedAt: true,
  meta: true,
} as const;

function mapSsoRole(role: string): Role {
  const normalized = role.trim().toLowerCase();
  if (normalized === 'admin' || normalized === 'super_admin' || normalized === 'super-admin') {
    return Role.ADMIN_GENERAL;
  }
  return Role.USER;
}

export async function upsertLocalUserFromSso(info: SsoUserInfo) {
  const email = info.email.trim().toLowerCase();
  const name = info.name?.trim() || email;
  const role = mapSsoRole(info.role ?? '');
  const meta = {
    ssoSub: info.sub,
    ssoRole: info.role,
    ssoPermissions: info.permissions ?? [],
    ssoStatus: info.status,
  };

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true, meta: true },
  });

  if (existing) {
    const previousMeta =
      existing.meta && typeof existing.meta === 'object' && !Array.isArray(existing.meta)
        ? (existing.meta as Record<string, unknown>)
        : {};

    return prisma.user.update({
      where: { id: existing.id },
      data: {
        name,
        role,
        isActive: info.status !== 'inactive',
        lastLogin: new Date(),
        meta: {
          ...previousMeta,
          ...meta,
        } as Prisma.InputJsonValue,
      },
      select: userPublicSelect,
    });
  }

  const randomPassword = await bcrypt.hash(randomBytes(32).toString('hex'), 10);

  return prisma.user.create({
    data: {
      name,
      email,
      password: randomPassword,
      role,
      isActive: info.status !== 'inactive',
      lastLogin: new Date(),
      meta: meta as Prisma.InputJsonValue,
    },
    select: userPublicSelect,
  });
}
