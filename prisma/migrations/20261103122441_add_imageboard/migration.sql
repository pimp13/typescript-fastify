-- CreateTable
CREATE TABLE "Board" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "isNsfw" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isWorksafe" BOOLEAN NOT NULL DEFAULT true,
    "bumpLimit" INTEGER NOT NULL DEFAULT 300,
    "threadLimit" INTEGER NOT NULL DEFAULT 150,
    "maxFileSizeMb" INTEGER NOT NULL DEFAULT 5,
    "forceImage" BOOLEAN NOT NULL DEFAULT false,
    "postCount" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Board_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Thread" (
    "id" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "subject" TEXT,
    "isSticky" BOOLEAN NOT NULL DEFAULT false,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "replyCount" INTEGER NOT NULL DEFAULT 0,
    "imageCount" INTEGER NOT NULL DEFAULT 0,
    "bumpedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Thread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "isOp" BOOLEAN NOT NULL DEFAULT false,
    "name" TEXT NOT NULL DEFAULT 'Anonymous',
    "tripcode" TEXT,
    "comment" TEXT NOT NULL,
    "fileName" TEXT,
    "fileUrl" TEXT,
    "fileMime" TEXT,
    "fileSize" INTEGER,
    "fileWidth" INTEGER,
    "fileHeight" INTEGER,
    "isSpoiler" BOOLEAN NOT NULL DEFAULT false,
    "ipHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ban" (
    "id" TEXT NOT NULL,
    "ipHash" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ban_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Board_slug_key" ON "Board"("slug");

-- CreateIndex
CREATE INDEX "Board_isActive_sortOrder_idx" ON "Board"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "Thread_boardId_isSticky_bumpedAt_idx" ON "Thread"("boardId", "isSticky", "bumpedAt");

-- CreateIndex
CREATE INDEX "Thread_boardId_createdAt_idx" ON "Thread"("boardId", "createdAt");

-- CreateIndex
CREATE INDEX "Post_threadId_createdAt_idx" ON "Post"("threadId", "createdAt");

-- CreateIndex
CREATE INDEX "Post_boardId_createdAt_idx" ON "Post"("boardId", "createdAt");

-- CreateIndex
CREATE INDEX "Post_ipHash_idx" ON "Post"("ipHash");

-- CreateIndex
CREATE UNIQUE INDEX "Post_boardId_number_key" ON "Post"("boardId", "number");

-- CreateIndex
CREATE INDEX "Ban_ipHash_isActive_idx" ON "Ban"("ipHash", "isActive");

-- CreateIndex
CREATE INDEX "Ban_expiresAt_idx" ON "Ban"("expiresAt");

-- AddForeignKey
ALTER TABLE "Thread" ADD CONSTRAINT "Thread_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "Thread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ban" ADD CONSTRAINT "Ban_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
