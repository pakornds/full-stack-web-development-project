import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const managerRole = await prisma.role.findUnique({ where: { name: 'manager' } });
  const hrRole = await prisma.role.findUnique({ where: { name: 'hr' } });

  if (hrRole && managerRole) {
    console.log("Migrating users from 'hr' to 'manager'...");
    const result = await prisma.user.updateMany({
      where: { roleId: hrRole.id },
      data: { roleId: managerRole.id }
    });
    console.log(`Migrated ${result.count} users.`);
    
    try {
      await prisma.role.delete({ where: { id: hrRole.id } });
      console.log("'hr' role completely removed from DB.");
    } catch (e: any) {
      console.log("Could not delete hr role, skipping:", e.message);
    }
  } else {
    console.log("HR role or Manager role not found.");
  }
}

run().catch(console.error).finally(() => prisma.$disconnect());
