import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import type {
  CreateUserBody,
  ListUsersQuery,
  UpdateUserBody,
} from './users.schema.js';

const userPublicSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function listUsers(query: ListUsersQuery = {}) {
  const where: Prisma.UserWhereInput = {};

  if (query.role) {
    where.role = query.role;
  }

  if (query.search?.trim()) {
    const search = query.search.trim();
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  return prisma.user.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: userPublicSelect,
  });
}

export async function getUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: userPublicSelect,
  });
}

export async function createUser(data: CreateUserBody) {
  const hashedPassword = await bcrypt.hash(data.password, 10);

  return prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      password: hashedPassword,
      role: data.role ?? 'USER',
    },
    select: userPublicSelect,
  });
}

export async function deleteUser(id: string) {
  try {
    return await prisma.user.delete({
      where: { id },
      select: userPublicSelect,
    });
  } catch {
    return null;
  }
}

export async function updateUser(id: string, data: UpdateUserBody) {
  const updateData: Prisma.UserUpdateInput = {};

  if (data.name !== undefined) {
    updateData.name = data.name;
  }

  if (data.email !== undefined) {
    updateData.email = data.email;
  }

  if (data.role !== undefined) {
    updateData.role = data.role;
  }

  if (data.password !== undefined) {
    updateData.password = await bcrypt.hash(data.password, 10);
  }

  return prisma.user.update({
    where: { id },
    data: updateData,
    select: userPublicSelect,
  });
}

export async function countSuperAdmins() {
  return prisma.user.count({
    where: { role: 'SUPER_ADMIN' },
  });
}
