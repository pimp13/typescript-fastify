import bcrypt from 'bcryptjs';
import { prisma } from '../../lib/prisma.js';
import type { LoginBody, RegisterBody } from './auth.schema.js';

const userPublicSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  lastLogin: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function registerUser(data: RegisterBody) {
  const hashedPassword = await bcrypt.hash(data.password, 10);

  return prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      password: hashedPassword,
      role: 'USER',
      isActive: true,
      lastLogin: new Date(),
      meta: {},
    },
    select: userPublicSelect,
  });
}

export async function loginUser(data: LoginBody) {
  const user = await prisma.user.findUnique({
    where: { email: data.email },
    select: { id: true, password: true }
  });

  if (!user) {
    return null;
  }

  const isValidPassword = await bcrypt.compare(data.password, user.password);

  if (!isValidPassword) {
    return null;
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      lastLogin: new Date(),
    },
    select: userPublicSelect
  });

  return {
    id: updatedUser.id,
    name: updatedUser.name,
    email: updatedUser.email,
    role: updatedUser.role,
    isActive: updatedUser.isActive,
    lastLogin: updatedUser.lastLogin,
    createdAt: updatedUser.createdAt,
    updatedAt: updatedUser.updatedAt,
  };
}

export async function getAuthUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: userPublicSelect,
  });
}
