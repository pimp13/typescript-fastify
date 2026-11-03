import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { FastifyPluginAsync } from 'fastify';
import {
  ChanError,
  createThreadOrReply,
  getBoardBySlug,
  getThread,
  listBoards,
  listThreads,
} from './chan.service.js';
import { ALLOWED_MIME_TYPES } from './chan.utils.js';

const UPLOAD_DIR = join(process.cwd(), 'uploads');

async function ensureUploadDir() {
  await mkdir(UPLOAD_DIR, { recursive: true });
}

async function readMultipartPost(request: {
  isMultipart: () => boolean;
  parts: () => AsyncIterableIterator<any>;
}) {
  if (!request.isMultipart()) {
    throw new ChanError('Multipart form data is required', 415);
  }

  const fields: Record<string, string> = {};
  let file:
    | {
        buffer: Buffer;
        filename: string;
        mimetype: string;
        size: number;
      }
    | null = null;

  for await (const part of request.parts()) {
    if (part.type === 'file') {
      if (file) {
        throw new ChanError('Only one file is allowed');
      }

      if (!ALLOWED_MIME_TYPES.has(part.mimetype)) {
        throw new ChanError('Only JPEG, PNG, GIF, and WebP images are allowed');
      }

      const buffer = await part.toBuffer();
      file = {
        buffer,
        filename: part.filename || 'upload.bin',
        mimetype: part.mimetype,
        size: buffer.byteLength,
      };
      continue;
    }

    fields[part.fieldname] = String(part.value ?? '');
  }

  return { fields, file };
}

async function saveUpload(filename: string, buffer: Buffer) {
  const path = join(UPLOAD_DIR, filename);
  await writeFile(path, buffer);
  return `/uploads/${filename}`;
}

const chanRoutes: FastifyPluginAsync = async (app) => {
  await ensureUploadDir();

  app.get('/boards', async () => {
    const boards = await listBoards();
    return {
      ok: true,
      message: 'Boards fetched successfully',
      data: boards,
    };
  });

  app.get<{ Params: { slug: string } }>('/boards/:slug', async (request, reply) => {
    const board = await getBoardBySlug(request.params.slug);
    if (!board) {
      return reply.code(404).send({ ok: false, message: 'Board not found' });
    }

    return {
      ok: true,
      message: 'Board fetched successfully',
      data: board,
    };
  });

  app.get<{
    Params: { slug: string };
    Querystring: { mode?: 'list' | 'catalog'; page?: string; limit?: string };
  }>('/boards/:slug/threads', async (request, reply) => {
    try {
      const data = await listThreads(request.params.slug, {
        mode: request.query.mode === 'catalog' ? 'catalog' : 'list',
        page: Number(request.query.page ?? 1),
        limit: Number(request.query.limit ?? 15),
      });

      return {
        ok: true,
        message: 'Threads fetched successfully',
        data,
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

  app.get<{
    Params: { slug: string; threadId: string };
  }>('/boards/:slug/threads/:threadId', async (request, reply) => {
    try {
      const data = await getThread(request.params.slug, request.params.threadId);
      return {
        ok: true,
        message: 'Thread fetched successfully',
        data,
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

  app.post<{ Params: { slug: string } }>(
    '/boards/:slug/threads',
    async (request, reply) => {
      try {
        const { fields, file } = await readMultipartPost(request);
        const result = await createThreadOrReply({
          boardSlug: request.params.slug,
          subject: fields.subject,
          name: fields.name,
          email: fields.email,
          comment: fields.comment ?? '',
          isSpoiler: fields.spoiler === 'true' || fields.spoiler === '1',
          ip: request.ip,
          userAgent: request.headers['user-agent'],
          file,
          saveFile: saveUpload,
        });

        return reply.code(201).send({
          ok: true,
          message: 'Thread created successfully',
          data: result,
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

  app.post<{ Params: { slug: string; threadId: string } }>(
    '/boards/:slug/threads/:threadId/replies',
    async (request, reply) => {
      try {
        const { fields, file } = await readMultipartPost(request);
        const result = await createThreadOrReply({
          boardSlug: request.params.slug,
          threadId: request.params.threadId,
          name: fields.name,
          email: fields.email,
          comment: fields.comment ?? '',
          isSpoiler: fields.spoiler === 'true' || fields.spoiler === '1',
          ip: request.ip,
          userAgent: request.headers['user-agent'],
          file,
          saveFile: saveUpload,
        });

        return reply.code(201).send({
          ok: true,
          message: 'Reply created successfully',
          data: {
            board: result.board,
            thread: {
              id: result.thread.id,
              replyCount: result.thread.replyCount,
              imageCount: result.thread.imageCount,
              isLocked: result.thread.isLocked,
              isSticky: result.thread.isSticky,
              bumpedAt: result.thread.bumpedAt,
            },
            post: result.post,
          },
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
};

export default chanRoutes;
