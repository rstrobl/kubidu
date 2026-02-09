import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const userEmail = process.argv[2] || 'demo@kubidu.io';
  
  console.log(`Seeding demo invoices for ${userEmail}...`);

  // Find user
  const user = await prisma.user.findUnique({
    where: { email: userEmail },
    include: {
      workspaceMemberships: {
        include: { workspace: true },
      },
    },
  });

  if (!user) {
    console.log(`User ${userEmail} not found. Creating demo user and workspace...`);
    
    // Create demo user if not exists
    const newUser = await prisma.user.create({
      data: {
        email: userEmail,
        passwordHash: '$2b$10$demo.password.hash.not.real',
        name: 'Demo User',
        emailVerified: true,
      },
    });

    // Create demo workspace
    const workspace = await prisma.workspace.create({
      data: {
        name: 'Demo Workspace',
        slug: 'demo-workspace',
        members: {
          create: {
            userId: newUser.id,
            role: 'ADMIN',
          },
        },
      },
    });

    console.log(`Created demo user and workspace: ${workspace.id}`);
    
    await seedInvoices(workspace.id);
  } else if (user.workspaceMemberships.length === 0) {
    console.log('User has no workspaces. Creating demo workspace...');
    
    const workspace = await prisma.workspace.create({
      data: {
        name: 'Demo Workspace',
        slug: `demo-workspace-${Date.now()}`,
        members: {
          create: {
            userId: user.id,
            role: 'ADMIN',
          },
        },
      },
    });

    await seedInvoices(workspace.id);
  } else {
    const workspaceId = user.workspaceMemberships[0].workspaceId;
    console.log(`Using existing workspace: ${workspaceId}`);
    await seedInvoices(workspaceId);
  }

  console.log('Done!');
}

async function seedInvoices(workspaceId: string) {
  // Check if invoices already exist
  const existingInvoices = await prisma.invoice.count({
    where: { workspaceId },
  });

  if (existingInvoices > 0) {
    console.log(`Workspace already has ${existingInvoices} invoices. Skipping...`);
    return;
  }

  const demoInvoices = [
    {
      workspaceId,
      amount: 40.46,
      currency: 'eur',
      status: 'paid',
      paidAt: new Date('2026-02-05'),
      createdAt: new Date('2026-02-01'),
      dueDate: new Date('2026-02-15'),
    },
    {
      workspaceId,
      amount: 38.92,
      currency: 'eur',
      status: 'paid',
      paidAt: new Date('2026-01-10'),
      createdAt: new Date('2026-01-01'),
      dueDate: new Date('2026-01-15'),
    },
    {
      workspaceId,
      amount: 35.70,
      currency: 'eur',
      status: 'paid',
      paidAt: new Date('2025-12-12'),
      createdAt: new Date('2025-12-01'),
      dueDate: new Date('2025-12-15'),
    },
  ];

  for (const invoiceData of demoInvoices) {
    await prisma.invoice.create({
      data: invoiceData,
    });
    console.log(`Created invoice: ${invoiceData.amount} EUR (${invoiceData.status})`);
  }

  console.log(`Created ${demoInvoices.length} demo invoices`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
