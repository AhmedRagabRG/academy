import type { PrismaClient } from '../generated/client';

const TEAM_ID = '00000000-0000-4000-8000-000000000901';
const TICKET_ID = '00000000-0000-4000-8000-000000000902';
export async function seedTickets(prisma: PrismaClient): Promise<void> {
  const organization = await prisma.organization.findFirstOrThrow();
  const department = await prisma.department.findFirstOrThrow({
    where: { organizationId: organization.id },
  });
  const branch = await prisma.branch.findFirst({
    where: { organizationId: organization.id },
  });
  const account = await prisma.account.findFirstOrThrow({
    orderBy: { createdAt: 'asc' },
  });
  await prisma.ticketTeam.upsert({
    where: { id: TEAM_ID },
    update: { name: 'فريق الدعم', active: true },
    create: {
      id: TEAM_ID,
      organizationId: organization.id,
      name: 'فريق الدعم',
    },
  });
  await prisma.ticketTeamMembership.upsert({
    where: { teamId_employeeId: { teamId: TEAM_ID, employeeId: account.id } },
    update: { active: true },
    create: { teamId: TEAM_ID, employeeId: account.id },
  });
  await prisma.ticket.upsert({
    where: { id: TICKET_ID },
    update: {},
    create: {
      id: TICKET_ID,
      organizationId: organization.id,
      number: 'TKT-1001',
      title: 'متابعة طلب طالب',
      description: 'تذكرة تشغيلية تجريبية ثابتة',
      status: 'BACKLOG',
      lastActiveStatus: 'BACKLOG',
      priority: 'MEDIUM',
      priorityRank: 2,
      departmentId: department.id,
      branchId: branch?.id,
      teamId: TEAM_ID,
      employeeId: account.id,
      tags: ['متابعة'],
      createdBy: account.id,
      updatedBy: account.id,
      activitySequence: 1,
      activities: {
        create: {
          sequence: 1,
          type: 'created',
          actorId: account.id,
          actorName: account.displayName,
          message: 'تم إنشاء التذكرة',
          payload: { seeded: true },
        },
      },
    },
  });
  await prisma.ticketCounter.upsert({
    where: { organizationId: organization.id },
    update: { nextNumber: 1002 },
    create: { organizationId: organization.id, nextNumber: 1002 },
  });
}
