export type Role = 'USER' | 'SUPER_ADMIN' | 'ADMIN_GENERAL';

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  lastLogin: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateUserBody = {
  name: string;
  email: string;
  password: string;
  role?: Role;
};

export type UpdateUserBody = Partial<{
  name: string;
  email: string;
  password: string;
  role: Role;
  isActive: boolean;
}>;

export type ListUsersQuery = {
  search?: string;
  role?: Role;
};

const roleEnum = ['USER', 'SUPER_ADMIN', 'ADMIN_GENERAL'] as const;

export const createUserBodySchema = {
  type: 'object',
  required: ['name', 'email', 'password'],
  additionalProperties: false,
  properties: {
    name: { type: 'string', minLength: 2 },
    email: { type: 'string', format: 'email' },
    password: { type: 'string', minLength: 6 },
    role: { type: 'string', enum: roleEnum },
  },
} as const;

export const updateUserBodySchema = {
  type: 'object',
  additionalProperties: false,
  minProperties: 1,
  properties: {
    name: { type: 'string', minLength: 2 },
    email: { type: 'string', format: 'email' },
    password: { type: 'string', minLength: 6 },
    role: { type: 'string', enum: roleEnum },
    isActive: { type: 'boolean' },
  },
} as const;

export const listUsersQuerySchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    search: { type: 'string' },
    role: { type: 'string', enum: roleEnum },
  },
} as const;
