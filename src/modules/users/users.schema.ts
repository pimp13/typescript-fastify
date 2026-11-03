export type Role = 'USER' | 'SUPER_ADMIN';

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
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
}>;

export type ListUsersQuery = {
  search?: string;
  role?: Role;
};

export const createUserBodySchema = {
  type: 'object',
  required: ['name', 'email', 'password'],
  additionalProperties: false,
  properties: {
    name: { type: 'string', minLength: 2 },
    email: { type: 'string', format: 'email' },
    password: { type: 'string', minLength: 6 },
    role: { type: 'string', enum: ['USER', 'SUPER_ADMIN'] },
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
    role: { type: 'string', enum: ['USER', 'SUPER_ADMIN'] },
  },
} as const;

export const listUsersQuerySchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    search: { type: 'string' },
    role: { type: 'string', enum: ['USER', 'SUPER_ADMIN'] },
  },
} as const;
