import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  const password = await argon2.hash('y5k6pn*OOQXW%2');

  await prisma.user.upsert({
    where: { email: 'admin@company.com' },
    update: { password },
    create: {
      email: 'admin@company.com',
      name: 'Admin User',
      password,
      role: 'admin',
    },
  });

  await prisma.user.upsert({
    where: { email: 'manager@company.com' },
    update: { password },
    create: {
      email: 'manager@company.com',
      name: 'Manager User',
      password,
      role: 'manager',
    },
  });

  await prisma.user.upsert({
    where: { email: 'employee@company.com' },
    update: { password },
    create: {
      email: 'employee@company.com',
      name: 'Employee User',
      password,
      role: 'employee',
    },
  });

  console.log('Seed dummy users created');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
