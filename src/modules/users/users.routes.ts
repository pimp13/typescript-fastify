import { FastifyPluginAsync } from 'fastify';
import { Prisma } from '@prisma/client';
import { requireSuperAdmin } from '../../hooks/requireSuperAdmin.js';
import {
  countSuperAdmins,
  createUser,
  deleteUser,
  getUserById,
  listUsers,
  updateUser,
} from './users.service.js';
import {
  CreateUserBody,
  createUserBodySchema,
  ListUsersQuery,
  listUsersQuerySchema,
  UpdateUserBody,
  updateUserBodySchema,
} from './users.schema.js';

const usersRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireSuperAdmin);

  app.get<{ Querystring: ListUsersQuery }>(
    '/',
    { schema: { querystring: listUsersQuerySchema } },
    async (request) => {
      const users = await listUsers(request.query);

      return {
        ok: true,
        message: 'Users fetched successfully',
        data: users,
      };
    },
  );

  app.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const user = await getUserById(request.params.id);

    if (!user) {
      return reply.code(404).send({
        ok: false,
        message: 'User not found',
      });
    }

    return {
      ok: true,
      message: 'User fetched successfully',
      data: user,
    };
  });

  app.post<{ Body: CreateUserBody }>(
    '/',
    { schema: { body: createUserBodySchema } },
    async (request, reply) => {
      try {
        const user = await createUser(request.body);

        return reply.code(201).send({
          ok: true,
          message: 'User created successfully',
          data: user,
        });
      } catch (error: unknown) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          return reply.code(409).send({
            ok: false,
            message: 'Email already exists',
          });
        }

        throw error;
      }
    },
  );

  app.patch<{ Params: { id: string }; Body: UpdateUserBody }>(
    '/:id',
    { schema: { body: updateUserBodySchema } },
    async (request, reply) => {
      const existing = await getUserById(request.params.id);

      if (!existing) {
        return reply.code(404).send({
          ok: false,
          message: 'User not found',
        });
      }

      if (
        existing.role === 'SUPER_ADMIN' &&
        request.body.role === 'USER' &&
        existing.id === request.user.sub
      ) {
        return reply.code(400).send({
          ok: false,
          message: 'You cannot demote your own super admin account',
        });
      }

      if (
        existing.role === 'SUPER_ADMIN' &&
        request.body.role === 'USER'
      ) {
        const superAdminCount = await countSuperAdmins();
        if (superAdminCount <= 1) {
          return reply.code(400).send({
            ok: false,
            message: 'At least one super admin must remain',
          });
        }
      }

      try {
        const updatedUser = await updateUser(request.params.id, request.body);

        return {
          ok: true,
          message: 'User updated successfully',
          data: updatedUser,
        };
      } catch (error: unknown) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          return reply.code(409).send({
            ok: false,
            message: 'Email already exists',
          });
        }

        throw error;
      }
    },
  );

  app.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    if (request.params.id === request.user.sub) {
      return reply.code(400).send({
        ok: false,
        message: 'You cannot delete your own account',
      });
    }

    const existing = await getUserById(request.params.id);

    if (!existing) {
      return reply.code(404).send({
        ok: false,
        message: 'User not found',
      });
    }

    if (existing.role === 'SUPER_ADMIN') {
      const superAdminCount = await countSuperAdmins();
      if (superAdminCount <= 1) {
        return reply.code(400).send({
          ok: false,
          message: 'At least one super admin must remain',
        });
      }
    }

    const deletedUser = await deleteUser(request.params.id);

    if (!deletedUser) {
      return reply.code(404).send({
        ok: false,
        message: 'User not found',
      });
    }

    return {
      ok: true,
      message: 'User deleted successfully',
      data: deletedUser,
    };
  });
};

export default usersRoutes;
