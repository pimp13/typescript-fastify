import bcrypt from 'bcryptjs';
import { prisma } from '../../lib/prisma.js';
import { CreateUserBody, UpdateUserBody } from './users.schema.js';

const userPublicSelect = {
  id: true,
  name: true,
  email: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function listUsers() {
  return prisma.user.findMany({
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
  try {
    const updateData: {
      name?: string;
      email?: string;
      password?: string;
    } = {};

    if (data.name !== undefined) {
      updateData.name = data.name;
    }

    if (data.email !== undefined) {
      updateData.email = data.email;
    }

    if (data.password !== undefined) {
      updateData.password = await bcrypt.hash(data.password, 10);
    }

    return await prisma.user.update({
      where: { id },
      data: updateData,
      select: userPublicSelect,
    });
  } catch {
    throw new Error('Failed to update user');
  }
}
