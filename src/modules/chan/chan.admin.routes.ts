import type { FastifyPluginAsync } from 'fastify';
import { Prisma } from '@prisma/client';
import { requireAdmin } from '../../hooks/requireAdmin.js';
import {
  createBanBodySchema,
  createBoardBodySchema,
  updateBoardBodySchema,
  updateThreadBodySchema,
  type CreateBanBody,
  type CreateBoardBody,
  type UpdateBoardBody,
  type UpdateThreadBody,
} from './chan.schema.js';
import {
  ChanError,
  createBan,
  createBoard,
  deactivateBan,
  deleteBoard,
  deletePost,
  deleteThread,
  getChanStats,
  listBans,
  listBoards,
  listRecentPosts,
  listThreadsAdmin,
  updateBoard,
  updateThread,
} from './chan.service.js';

const chanAdminRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireAdmin);

  app.get('/stats', async () => ({
    ok: true,
    message: 'Chan stats fetched successfully',
    data: await getChanStats(),
  }));

  app.get('/boards', async () => ({
    ok: true,
    message: 'Boards fetched successfully',
    data: await listBoards(true),
  }));

  app.post<{ Body: CreateBoardBody }>(
    '/boards',
    { schema: { body: createBoardBodySchema } },
    async (request, reply) => {
      try {
        const board = await createBoard(request.body);
        return reply.code(201).send({
          ok: true,
          message: 'Board created successfully',
          data: board,
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          return reply.code(409).send({
            ok: false,
            message: 'Board slug already exists',
          });
        }
        throw error;
      }
    },
  );

  app.patch<{ Params: { id: string }; Body: UpdateBoardBody }>(
    '/boards/:id',
    { schema: { body: updateBoardBodySchema } },
    async (request, reply) => {
      try {
        const board = await updateBoard(request.params.id, request.body);
        return {
          ok: true,
          message: 'Board updated successfully',
          data: board,
        };
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2025'
        ) {
          return reply.code(404).send({ ok: false, message: 'Board not found' });
        }
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          return reply.code(409).send({
            ok: false,
            message: 'Board slug already exists',
          });
        }
        throw error;
      }
    },
  );

  app.delete<{ Params: { id: string } }>('/boards/:id', async (request, reply) => {
    try {
      const board = await deleteBoard(request.params.id);
      return {
        ok: true,
        message: 'Board deleted successfully',
        data: board,
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        return reply.code(404).send({ ok: false, message: 'Board not found' });
      }
      throw error;
    }
  });

  app.get('/threads', async (request) => {
    const limit = Number((request.query as { limit?: string }).limit ?? 40);
    return {
      ok: true,
      message: 'Threads fetched successfully',
      data: await listThreadsAdmin(limit),
    };
  });

  app.patch<{ Params: { id: string }; Body: UpdateThreadBody }>(
    '/threads/:id',
    { schema: { body: updateThreadBodySchema } },
    async (request, reply) => {
      try {
        const thread = await updateThread(request.params.id, request.body);
        return {
          ok: true,
          message: 'Thread updated successfully',
          data: thread,
        };
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2025'
        ) {
          return reply.code(404).send({ ok: false, message: 'Thread not found' });
        }
        throw error;
      }
    },
  );

  app.delete<{ Params: { id: string } }>('/threads/:id', async (request, reply) => {
    try {
      const thread = await deleteThread(request.params.id);
      return {
        ok: true,
        message: 'Thread deleted successfully',
        data: thread,
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        return reply.code(404).send({ ok: false, message: 'Thread not found' });
      }
      throw error;
    }
  });

  app.get('/posts', async (request) => {
    const limit = Number((request.query as { limit?: string }).limit ?? 40);
    return {
      ok: true,
      message: 'Posts fetched successfully',
      data: await listRecentPosts(limit),
    };
  });

  app.delete<{ Params: { id: string } }>('/posts/:id', async (request, reply) => {
    try {
      const result = await deletePost(request.params.id);
      return {
        ok: true,
        message: 'Post deleted successfully',
        data: result,
      };
    } catch (error) {
      if (error instanceof ChanError) {
        return reply.code(error.statusCode).send({
          ok: false,
          message: error.message,
        });
      }
      throw error;
    }
  });

  app.get('/bans', async () => ({
    ok: true,
    message: 'Bans fetched successfully',
    data: await listBans(),
  }));

  app.post<{ Body: CreateBanBody }>(
    '/bans',
    { schema: { body: createBanBodySchema } },
    async (request, reply) => {
      try {
        const ban = await createBan(request.body, request.user.sub);
        return reply.code(201).send({
          ok: true,
          message: 'Ban created successfully',
          data: ban,
        });
      } catch (error) {
        if (error instanceof ChanError) {
          return reply.code(error.statusCode).send({
            ok: false,
            message: error.message,
          });
        }
        throw error;
      }
    },
  );

  app.delete<{ Params: { id: string } }>('/bans/:id', async (request, reply) => {
    try {
      const ban = await deactivateBan(request.params.id);
      return {
        ok: true,
        message: 'Ban deactivated successfully',
        data: ban,
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        return reply.code(404).send({ ok: false, message: 'Ban not found' });
      }
      throw error;
    }
  });
};

export default chanAdminRoutes;
