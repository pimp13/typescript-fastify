import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const defaultBoards = [
  {
    slug: 'b',
    title: 'Random',
    description: 'The place for everything and nothing.',
    isNsfw: true,
    isWorksafe: false,
    forceImage: false,
    sortOrder: 1,
  },
  {
    slug: 'g',
    title: 'Technology',
    description: 'Hardware, software, and the future of computing.',
    isNsfw: false,
    isWorksafe: true,
    forceImage: false,
    sortOrder: 2,
  },
  {
    slug: 'a',
    title: 'Anime & Manga',
    description: 'Discussions about anime, manga, and related media.',
    isNsfw: false,
    isWorksafe: true,
    forceImage: false,
    sortOrder: 3,
  },
  {
    slug: 'mu',
    title: 'Music',
    description: 'Share tracks, scenes, and sonic rabbit holes.',
    isNsfw: false,
    isWorksafe: true,
    forceImage: false,
    sortOrder: 4,
  },
  {
    slug: 'biz',
    title: 'Business & Finance',
    description: 'Markets, startups, and capital allocation debates.',
    isNsfw: false,
    isWorksafe: true,
    forceImage: false,
    sortOrder: 5,
  },
];

async function main() {
  const email = process.env.SUPER_ADMIN_EMAIL ?? 'admin@funlife.local';
  const password = process.env.SUPER_ADMIN_PASSWORD ?? 'admin123';
  const name = process.env.SUPER_ADMIN_NAME ?? 'Super Admin';

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      role: 'SUPER_ADMIN',
      name,
      password: hashedPassword,
      isActive: true,
    },
    create: {
      email,
      name,
      password: hashedPassword,
      role: 'SUPER_ADMIN',
      isActive: true,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  });

  for (const board of defaultBoards) {
    await prisma.board.upsert({
      where: { slug: board.slug },
      update: {
        title: board.title,
        description: board.description,
        isNsfw: board.isNsfw,
        isWorksafe: board.isWorksafe,
        forceImage: board.forceImage,
        sortOrder: board.sortOrder,
        isActive: true,
      },
      create: board,
    });
  }

  console.log('Super admin ready:', user);
  console.log(
    'Boards ready:',
    defaultBoards.map((board) => `/${board.slug}/`).join(' '),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
