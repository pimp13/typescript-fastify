import { FastifyPluginAsync } from 'fastify';
import {
  createUser,
  deleteUser,
  getUserById,
  listUsers,
  updateUser,
} from './users.service.js';
import { CreateUserBody, createUserBodySchema, UpdateUserBody, updateUserBodySchema } from './users.schema.js';
import { Prisma } from '@prisma/client';

const usersRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async () => {
    const users = await listUsers();

    return {
      ok: true,
      message: 'Users fetched successfully!',
      data: users,
    };
  });

  app.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const user = await getUserById(request.params.id);

    if (!user) {
      return reply.code(404).send({
        ok: false,
        message: 'User not found',
      });
    }

    return { ok: true, message: 'User fetched successfully', data: user };
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
          typeof error === 'object' &&
          error !== null &&
          'code' in error &&
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

  app.patch<{ Params: { id: string }, Body: UpdateUserBody }>(
    '/:id',
    { schema: { body: updateUserBodySchema } },
    async (request, reply) => {
      try {
        const updatedUser = await updateUser(request.params.id, request.body);

        return reply.code(200).send({
          ok: true,
          message: 'User updated successfully',
          data: updatedUser,
        });
      } catch (error: unknown) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (error.code === 'P2002') {
            return reply.code(409).send({
              ok: false,
              message: 'Email already exists',
            });
          }
        }
      }
    }
  );

  app.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
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
