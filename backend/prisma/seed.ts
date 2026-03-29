import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {

  console.log('🌱 Seeding database...');

  // ── Roles ─────────────────────────────────────────────────
  const roleNames = ['admin', 'manager', 'employee'];

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

  // departments[0]=Engineering, [1]=Human Resources, [2]=Marketing, [3]=Finance, [4]=Operations
  const usersData = [
    // Admin
    { email: 'admin@company.com', name: 'Alice Admin', roleId: roles['admin'].id, departmentId: departments[0].id },

    // Managers — one per department
    { email: 'manager.eng@company.com',  name: 'Tom Engineering Manager', roleId: roles['manager'].id, departmentId: departments[0].id },
    { email: 'manager.hr@company.com',   name: 'Hannah HR Manager',       roleId: roles['manager'].id, departmentId: departments[1].id },
    { email: 'manager.mkt@company.com',  name: 'Lisa Marketing Manager',  roleId: roles['manager'].id, departmentId: departments[2].id },
    { email: 'manager.fin@company.com',  name: 'David Finance Manager',   roleId: roles['manager'].id, departmentId: departments[3].id },
    { email: 'manager.ops@company.com',  name: 'Karen Operations Manager',roleId: roles['manager'].id, departmentId: departments[4].id },

    // Employees spread across departments
    { email: 'emp1@company.com', name: 'John Engineer',   roleId: roles['employee'].id, departmentId: departments[0].id },
    { email: 'emp2@company.com', name: 'Jane Designer',   roleId: roles['employee'].id, departmentId: departments[0].id },
    { email: 'emp3@company.com', name: 'Bob Marketer',    roleId: roles['employee'].id, departmentId: departments[2].id },
    { email: 'emp4@company.com', name: 'Sara Finance',    roleId: roles['employee'].id, departmentId: departments[3].id },
    { email: 'emp5@company.com', name: 'Mike HR',         roleId: roles['employee'].id, departmentId: departments[1].id },
    { email: 'emp6@company.com', name: 'Eva Operations',  roleId: roles['employee'].id, departmentId: departments[4].id },
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
  // users: [0]=admin, [1]=eng mgr, [2]=hr mgr, [3]=mkt mgr, [4]=fin mgr, [5]=ops mgr
  //        [6]=John(eng), [7]=Jane(eng), [8]=Bob(mkt), [9]=Sara(fin), [10]=Mike(hr), [11]=Eva(ops)

  const sampleRequests = [
    {
      userId: users[6].id,       // John Engineer
      leaveTypeId: leaveTypes[0].id,
      startDate: new Date('2026-01-15'),
      endDate: new Date('2026-01-17'),
      reason: 'Family vacation',
      status: 'approved',
      approvedById: users[1].id, // Eng manager
    },
    {
      userId: users[6].id,       // John Engineer
      leaveTypeId: leaveTypes[1].id,
      startDate: new Date('2026-02-10'),
      endDate: new Date('2026-02-10'),
      reason: 'Feeling unwell',
      status: 'approved',
      approvedById: users[1].id, // Eng manager
    },
    {
      userId: users[7].id,       // Jane Designer (eng)
      leaveTypeId: leaveTypes[0].id,
      startDate: new Date('2026-03-05'),
      endDate: new Date('2026-03-07'),
      reason: 'Personal trip',
      status: 'approved',
      approvedById: users[1].id, // Eng manager
    },
    {
      userId: users[8].id,       // Bob Marketer
      leaveTypeId: leaveTypes[2].id,
      startDate: new Date('2026-04-01'),
      endDate: new Date('2026-04-01'),
      reason: 'Moving to new apartment',
      status: 'pending',
      approvedById: null,
    },
    {
      userId: users[9].id,       // Sara Finance
      leaveTypeId: leaveTypes[0].id,
      startDate: new Date('2026-04-15'),
      endDate: new Date('2026-04-18'),
      reason: 'Spring holiday',
      status: 'pending',
      approvedById: null,
    },
    {
      userId: users[10].id,      // Mike HR
      leaveTypeId: leaveTypes[2].id,
      startDate: new Date('2026-05-01'),
      endDate: new Date('2026-05-02'),
      reason: 'Personal errand',
      status: 'rejected',
      approvedById: users[2].id, // HR manager
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
