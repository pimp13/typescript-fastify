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
  });

  if (!user) {
    return null;
  }

  const isValidPassword = await bcrypt.compare(data.password, user.password);

  if (!isValidPassword) {
    return null;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      lastLogin: new Date(),
    }
  });

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    lastLogin: user.lastLogin,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function getAuthUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: userPublicSelect,
  });
}
