import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ── Roles ─────────────────────────────────────────────────
  const roleNames = ['admin', 'hr', 'manager', 'employee'];

  const roles: Record<string, { id: string; name: string }> = {};

  for (const name of roleNames) {
    const role = await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    roles[name] = role;
  }

  console.log(`✅ Created ${Object.keys(roles).length} roles`);

  // ── Departments ──────────────────────────────────────────
  const departments = await Promise.all(
    ['Engineering', 'Human Resources', 'Marketing', 'Finance', 'Operations'].map(
      (name) =>
        prisma.department.upsert({
          where: { name },
          update: {},
          create: { name },
        }),
    ),
  );

  console.log(`✅ Created ${departments.length} departments`);

  // ── Leave Types ──────────────────────────────────────────
  const leaveTypesData = [
    { name: 'Annual Leave', defaultDays: 15 },
    { name: 'Sick Leave', defaultDays: 10 },
    { name: 'Personal Leave', defaultDays: 5 },
    { name: 'Maternity Leave', defaultDays: 90 },
  ];

  const leaveTypes = await Promise.all(
    leaveTypesData.map((lt) =>
      prisma.leaveType.upsert({
        where: { name: lt.name },
        update: { defaultDays: lt.defaultDays },
        create: lt,
      }),
    ),
  );

  console.log(`✅ Created ${leaveTypes.length} leave types`);

  // ── Users ────────────────────────────────────────────────
  const defaultPassword = await argon2.hash('password123');

  const usersData = [
    { email: 'admin@company.com', name: 'Alice Admin', roleId: roles['admin'].id, departmentId: departments[0].id },
    { email: 'hr@company.com', name: 'Hannah HR', roleId: roles['hr'].id, departmentId: departments[1].id },
    { email: 'emp1@company.com', name: 'John Engineer', roleId: roles['employee'].id, departmentId: departments[0].id },
    { email: 'emp2@company.com', name: 'Jane Designer', roleId: roles['employee'].id, departmentId: departments[0].id },
    { email: 'emp3@company.com', name: 'Bob Marketer', roleId: roles['employee'].id, departmentId: departments[2].id },
    { email: 'emp4@company.com', name: 'Sara Finance', roleId: roles['employee'].id, departmentId: departments[3].id },
    { email: 'hr2@company.com', name: 'Mike HR', roleId: roles['hr'].id, departmentId: departments[1].id },
  ];

  const users = await Promise.all(
    usersData.map((u) =>
      prisma.user.upsert({
        where: { email: u.email },
        update: { roleId: u.roleId, departmentId: u.departmentId },
        create: { ...u, password: defaultPassword },
        include: { role: true },
      }),
    ),
  );

  console.log(`✅ Created ${users.length} users`);

  // ── Leave Quotas (current year) ──────────────────────────
  const currentYear = new Date().getFullYear();

  for (const user of users) {
    for (const lt of leaveTypes) {
      await prisma.leaveQuota.upsert({
        where: {
          userId_leaveTypeId_year: {
            userId: user.id,
            leaveTypeId: lt.id,
            year: currentYear,
          },
        },
        update: {},
        create: {
          userId: user.id,
          leaveTypeId: lt.id,
          year: currentYear,
          totalDays: lt.defaultDays,
          usedDays: 0,
        },
      });
    }
  }

  console.log(`✅ Created leave quotas for ${users.length} users`);

  // ── Sample Leave Requests ────────────────────────────────
  const hrUser = users.find((u) => u.role.name === 'hr')!;

  const sampleRequests = [
    {
      userId: users[2].id,
      leaveTypeId: leaveTypes[0].id,
      startDate: new Date('2026-01-15'),
      endDate: new Date('2026-01-17'),
      reason: 'Family vacation',
      status: 'approved',
      approverId: hrUser.id,
    },
    {
      userId: users[2].id,
      leaveTypeId: leaveTypes[1].id,
      startDate: new Date('2026-02-10'),
      endDate: new Date('2026-02-10'),
      reason: 'Feeling unwell',
      status: 'approved',
      approverId: hrUser.id,
    },
    {
      userId: users[3].id,
      leaveTypeId: leaveTypes[0].id,
      startDate: new Date('2026-03-05'),
      endDate: new Date('2026-03-07'),
      reason: 'Personal trip',
      status: 'approved',
      approverId: hrUser.id,
    },
    {
      userId: users[4].id,
      leaveTypeId: leaveTypes[2].id,
      startDate: new Date('2026-04-01'),
      endDate: new Date('2026-04-01'),
      reason: 'Moving to new apartment',
      status: 'pending',
      approverId: null,
    },
    {
      userId: users[5].id,
      leaveTypeId: leaveTypes[0].id,
      startDate: new Date('2026-04-15'),
      endDate: new Date('2026-04-18'),
      reason: 'Spring holiday',
      status: 'pending',
      approverId: null,
    },
    {
      userId: users[2].id,
      leaveTypeId: leaveTypes[2].id,
      startDate: new Date('2026-05-01'),
      endDate: new Date('2026-05-02'),
      reason: 'Personal errand',
      status: 'rejected',
      approverId: hrUser.id,
    },
  ];

  // Delete existing sample requests to avoid duplicates
  await prisma.leaveRequest.deleteMany({});

  for (const req of sampleRequests) {
    await prisma.leaveRequest.create({ data: req });
  }

  // Update used days for approved requests
  const approvedRequests = sampleRequests.filter((r) => r.status === 'approved');
  for (const req of approvedRequests) {
    const days = Math.ceil(
      (req.endDate.getTime() - req.startDate.getTime()) / (1000 * 60 * 60 * 24),
    ) + 1;

    await prisma.leaveQuota.updateMany({
      where: {
        userId: req.userId,
        leaveTypeId: req.leaveTypeId,
        year: currentYear,
      },
      data: { usedDays: { increment: days } },
    });
  }

  console.log(`✅ Created ${sampleRequests.length} sample leave requests`);
  console.log('🎉 Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
