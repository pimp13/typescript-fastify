import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
    },
    create: {
      email,
      name,
      password: hashedPassword,
      role: 'SUPER_ADMIN',
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  });

  console.log('Super admin ready:', user);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
