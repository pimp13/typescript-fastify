import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import type {
  CreateBanBody,
  CreateBoardBody,
  UpdateBoardBody,
  UpdateThreadBody,
} from './chan.schema.js';
import {
  createUploadFilename,
  hashIp,
  isSageEmail,
  parsePosterName,
} from './chan.utils.js';

const boardPublicSelect = {
  id: true,
  slug: true,
  title: true,
  description: true,
  isNsfw: true,
  isActive: true,
  isWorksafe: true,
  bumpLimit: true,
  threadLimit: true,
  maxFileSizeMb: true,
  forceImage: true,
  postCount: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
} as const;

const postPublicSelect = {
  id: true,
  boardId: true,
  threadId: true,
  number: true,
  isOp: true,
  name: true,
  tripcode: true,
  comment: true,
  fileName: true,
  fileUrl: true,
  fileMime: true,
  fileSize: true,
  fileWidth: true,
  fileHeight: true,
  isSpoiler: true,
  createdAt: true,
} as const;

export class ChanError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = 'ChanError';
    this.statusCode = statusCode;
  }
}

export async function listBoards(includeInactive = false) {
  return prisma.board.findMany({
    where: includeInactive ? undefined : { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
    select: {
      ...boardPublicSelect,
      _count: { select: { threads: true } },
    },
  });
}

export async function getBoardBySlug(slug: string, includeInactive = false) {
  return prisma.board.findFirst({
    where: {
      slug,
      ...(includeInactive ? {} : { isActive: true }),
    },
    select: boardPublicSelect,
  });
}

export async function getBoardById(id: string) {
  return prisma.board.findUnique({
    where: { id },
    select: boardPublicSelect,
  });
}

export async function createBoard(data: CreateBoardBody) {
  return prisma.board.create({
    data: {
      slug: data.slug.toLowerCase(),
      title: data.title,
      description: data.description ?? '',
      isNsfw: data.isNsfw ?? false,
      isWorksafe: data.isWorksafe ?? true,
      isActive: data.isActive ?? true,
      bumpLimit: data.bumpLimit ?? 300,
      threadLimit: data.threadLimit ?? 150,
      maxFileSizeMb: data.maxFileSizeMb ?? 5,
      forceImage: data.forceImage ?? false,
      sortOrder: data.sortOrder ?? 0,
    },
    select: boardPublicSelect,
  });
}

export async function updateBoard(id: string, data: UpdateBoardBody) {
  const payload: Prisma.BoardUpdateInput = {};

  if (data.slug !== undefined) payload.slug = data.slug.toLowerCase();
  if (data.title !== undefined) payload.title = data.title;
  if (data.description !== undefined) payload.description = data.description;
  if (data.isNsfw !== undefined) payload.isNsfw = data.isNsfw;
  if (data.isWorksafe !== undefined) payload.isWorksafe = data.isWorksafe;
  if (data.isActive !== undefined) payload.isActive = data.isActive;
  if (data.bumpLimit !== undefined) payload.bumpLimit = data.bumpLimit;
  if (data.threadLimit !== undefined) payload.threadLimit = data.threadLimit;
  if (data.maxFileSizeMb !== undefined) payload.maxFileSizeMb = data.maxFileSizeMb;
  if (data.forceImage !== undefined) payload.forceImage = data.forceImage;
  if (data.sortOrder !== undefined) payload.sortOrder = data.sortOrder;

  return prisma.board.update({
    where: { id },
    data: payload,
    select: boardPublicSelect,
  });
}

export async function deleteBoard(id: string) {
  return prisma.board.delete({
    where: { id },
    select: boardPublicSelect,
  });
}

export async function assertNotBanned(ip: string) {
  const ipHash = hashIp(ip);
  const now = new Date();

  const ban = await prisma.ban.findFirst({
    where: {
      ipHash,
      isActive: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
  });

  if (ban) {
    throw new ChanError(
      `You are banned${ban.expiresAt ? ` until ${ban.expiresAt.toISOString()}` : ''}: ${ban.reason}`,
      403,
    );
  }

  return ipHash;
}

async function pruneOldestThreads(boardId: string, threadLimit: number) {
  const overflow = await prisma.thread.findMany({
    where: { boardId, isSticky: false },
    orderBy: { bumpedAt: 'desc' },
    skip: threadLimit,
    select: { id: true },
  });

  if (overflow.length === 0) return;

  await prisma.thread.deleteMany({
    where: { id: { in: overflow.map((thread) => thread.id) } },
  });
}

type CreatePostInput = {
  boardSlug: string;
  threadId?: string;
  subject?: string;
  name?: string;
  email?: string;
  comment: string;
  isSpoiler?: boolean;
  ip: string;
  userAgent?: string;
  file?: {
    buffer: Buffer;
    filename: string;
    mimetype: string;
    size: number;
  } | null;
  saveFile: (filename: string, buffer: Buffer) => Promise<string>;
};

export async function createThreadOrReply(input: CreatePostInput) {
  const board = await getBoardBySlug(input.boardSlug);
  if (!board) {
    throw new ChanError('Board not found', 404);
  }

  const comment = input.comment.trim();
  if (!comment && !input.file) {
    throw new ChanError('Comment or image is required');
  }

  if (comment.length > 4000) {
    throw new ChanError('Comment is too long');
  }

  const ipHash = await assertNotBanned(input.ip);
  const poster = parsePosterName(input.name);
  const sage = poster.isSage || isSageEmail(input.email);

  let fileMeta: {
    fileName: string;
    fileUrl: string;
    fileMime: string;
    fileSize: number;
  } | null = null;

  if (input.file) {
    const maxBytes = board.maxFileSizeMb * 1024 * 1024;
    if (input.file.size > maxBytes) {
      throw new ChanError(`File exceeds ${board.maxFileSizeMb}MB limit`);
    }

    const storedName = createUploadFilename(input.file.filename);
    const fileUrl = await input.saveFile(storedName, input.file.buffer);
    fileMeta = {
      fileName: input.file.filename.slice(0, 180),
      fileUrl,
      fileMime: input.file.mimetype,
      fileSize: input.file.size,
    };
  }

  if (!input.threadId && board.forceImage && !fileMeta) {
    throw new ChanError('This board requires an image to create a thread');
  }

  return prisma.$transaction(async (tx) => {
    let threadId = input.threadId;
    let isOp = false;

    if (!threadId) {
      isOp = true;
      const thread = await tx.thread.create({
        data: {
          boardId: board.id,
          subject: input.subject?.trim().slice(0, 120) || null,
          replyCount: 0,
          imageCount: fileMeta ? 1 : 0,
          bumpedAt: new Date(),
        },
      });
      threadId = thread.id;
    } else {
      const thread = await tx.thread.findFirst({
        where: { id: threadId, boardId: board.id },
      });

      if (!thread) {
        throw new ChanError('Thread not found', 404);
      }

      if (thread.isLocked) {
        throw new ChanError('Thread is locked', 403);
      }
    }

    const updatedBoard = await tx.board.update({
      where: { id: board.id },
      data: { postCount: { increment: 1 } },
      select: { postCount: true },
    });

    const post = await tx.post.create({
      data: {
        boardId: board.id,
        threadId,
        number: updatedBoard.postCount,
        isOp,
        name: poster.name,
        tripcode: poster.tripcode,
        comment: comment || (fileMeta ? '' : 'Empty'),
        isSpoiler: Boolean(input.isSpoiler),
        ipHash,
        userAgent: input.userAgent?.slice(0, 250),
        ...(fileMeta ?? {}),
      },
      select: postPublicSelect,
    });

    if (!isOp) {
      const thread = await tx.thread.findUniqueOrThrow({
        where: { id: threadId },
      });

      const nextReplyCount = thread.replyCount + 1;
      const shouldBump =
        !sage && !thread.isLocked && nextReplyCount <= board.bumpLimit;

      await tx.thread.update({
        where: { id: threadId },
        data: {
          replyCount: { increment: 1 },
          imageCount: fileMeta ? { increment: 1 } : undefined,
          bumpedAt: shouldBump ? new Date() : thread.bumpedAt,
        },
      });
    }

    await pruneOldestThreads(board.id, board.threadLimit);

    const thread = await tx.thread.findUniqueOrThrow({
      where: { id: threadId },
      include: {
        posts: {
          orderBy: { number: 'asc' },
          select: postPublicSelect,
          take: isOp ? 1 : undefined,
        },
      },
    });

    return { board, thread, post };
  });
}

export async function listThreads(
  boardSlug: string,
  options: { mode?: 'list' | 'catalog'; page?: number; limit?: number } = {},
) {
  const board = await getBoardBySlug(boardSlug);
  if (!board) {
    throw new ChanError('Board not found', 404);
  }

  const page = Math.max(1, options.page ?? 1);
  const limit = Math.min(50, Math.max(1, options.limit ?? (options.mode === 'catalog' ? 40 : 15)));
  const skip = (page - 1) * limit;

  const [total, threads] = await Promise.all([
    prisma.thread.count({ where: { boardId: board.id } }),
    prisma.thread.findMany({
      where: { boardId: board.id },
      orderBy: [{ isSticky: 'desc' }, { bumpedAt: 'desc' }],
      skip,
      take: limit,
      include: {
        posts: {
          orderBy: { number: 'asc' },
          take: options.mode === 'catalog' ? 1 : 4,
          select: postPublicSelect,
        },
      },
    }),
  ]);

  const enriched = await Promise.all(
    threads.map(async (thread) => {
      const lastReplies =
        options.mode === 'catalog'
          ? []
          : await prisma.post.findMany({
              where: { threadId: thread.id, isOp: false },
              orderBy: { number: 'desc' },
              take: 3,
              select: postPublicSelect,
            });

      const op = thread.posts.find((post) => post.isOp) ?? thread.posts[0] ?? null;

      return {
        id: thread.id,
        boardId: thread.boardId,
        subject: thread.subject,
        isSticky: thread.isSticky,
        isLocked: thread.isLocked,
        replyCount: thread.replyCount,
        imageCount: thread.imageCount,
        bumpedAt: thread.bumpedAt,
        createdAt: thread.createdAt,
        op,
        lastReplies: lastReplies.reverse(),
      };
    }),
  );

  return {
    board,
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    threads: enriched,
  };
}

export async function getThread(boardSlug: string, threadId: string) {
  const board = await getBoardBySlug(boardSlug);
  if (!board) {
    throw new ChanError('Board not found', 404);
  }

  const thread = await prisma.thread.findFirst({
    where: { id: threadId, boardId: board.id },
    include: {
      posts: {
        orderBy: { number: 'asc' },
        select: postPublicSelect,
      },
    },
  });

  if (!thread) {
    throw new ChanError('Thread not found', 404);
  }

  return { board, thread };
}

export async function updateThread(id: string, data: UpdateThreadBody) {
  return prisma.thread.update({
    where: { id },
    data,
    include: {
      board: { select: { slug: true, title: true } },
      posts: {
        where: { isOp: true },
        take: 1,
        select: postPublicSelect,
      },
    },
  });
}

export async function deleteThread(id: string) {
  return prisma.thread.delete({
    where: { id },
    select: { id: true, boardId: true },
  });
}

export async function deletePost(id: string) {
  const post = await prisma.post.findUnique({
    where: { id },
    include: { thread: true },
  });

  if (!post) {
    throw new ChanError('Post not found', 404);
  }

  if (post.isOp) {
    await prisma.thread.delete({ where: { id: post.threadId } });
    return { deleted: 'thread' as const, id: post.threadId };
  }

  await prisma.$transaction([
    prisma.post.delete({ where: { id } }),
    prisma.thread.update({
      where: { id: post.threadId },
      data: {
        replyCount: { decrement: 1 },
        imageCount: post.fileUrl ? { decrement: 1 } : undefined,
      },
    }),
  ]);

  return { deleted: 'post' as const, id: post.id };
}

export async function listRecentPosts(limit = 40) {
  return prisma.post.findMany({
    orderBy: { createdAt: 'desc' },
    take: Math.min(100, Math.max(1, limit)),
    include: {
      board: { select: { slug: true, title: true } },
      thread: { select: { id: true, subject: true } },
    },
  });
}

export async function listThreadsAdmin(limit = 40) {
  return prisma.thread.findMany({
    orderBy: { bumpedAt: 'desc' },
    take: Math.min(100, Math.max(1, limit)),
    include: {
      board: { select: { slug: true, title: true } },
      posts: {
        where: { isOp: true },
        take: 1,
        select: postPublicSelect,
      },
    },
  });
}

export async function createBan(data: CreateBanBody, createdById?: string) {
  let ipHash = data.ipHash;

  if (!ipHash && data.postId) {
    const post = await prisma.post.findUnique({
      where: { id: data.postId },
      select: { ipHash: true },
    });
    if (!post) {
      throw new ChanError('Post not found', 404);
    }
    ipHash = post.ipHash;
  }

  if (!ipHash) {
    throw new ChanError('ipHash or postId is required');
  }

  return prisma.ban.create({
    data: {
      ipHash,
      reason: data.reason,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      createdById,
    },
  });
}

export async function listBans() {
  return prisma.ban.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });
}

export async function deactivateBan(id: string) {
  return prisma.ban.update({
    where: { id },
    data: { isActive: false },
  });
}

export async function getChanStats() {
  const [boards, threads, posts, bans, nsfwBoards] = await Promise.all([
    prisma.board.count(),
    prisma.thread.count(),
    prisma.post.count(),
    prisma.ban.count({ where: { isActive: true } }),
    prisma.board.count({ where: { isNsfw: true } }),
  ]);

  return { boards, threads, posts, activeBans: bans, nsfwBoards };
}
