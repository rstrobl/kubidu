import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { InvoicesService, InvoiceDetails } from '../invoices.service';
import { PrismaService } from '../../../database/prisma.service';

describe('InvoicesService', () => {
  let service: InvoicesService;
  let prisma: PrismaService;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
  };

  const mockWorkspace = {
    id: 'workspace-123',
    name: 'Test Workspace',
    members: [{ userId: 'user-123', user: mockUser }],
  };

  const mockInvoice = {
    id: 'invoice-123',
    workspaceId: 'workspace-123',
    amount: 119.0,
    currency: 'eur',
    status: 'paid',
    paidAt: new Date('2026-02-05'),
    createdAt: new Date('2026-02-01'),
    dueDate: new Date('2026-02-15'),
    workspace: mockWorkspace,
  };

  const mockPrisma = {
    workspaceMember: {
      findMany: jest.fn(),
    },
    invoice: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoicesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<InvoicesService>(InvoicesService);
    prisma = module.get(PrismaService);
  });

  describe('findAllForUser', () => {
    it('should return all invoices for user workspaces', async () => {
      (prisma.workspaceMember.findMany as jest.Mock).mockResolvedValue([
        { workspaceId: 'workspace-123' },
      ]);
      (prisma.invoice.findMany as jest.Mock).mockResolvedValue([mockInvoice]);

      const result = await service.findAllForUser('user-123');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('invoice-123');
      expect(result[0].status).toBe('paid');
      expect(prisma.workspaceMember.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        select: { workspaceId: true },
      });
    });

    it('should return empty array when user has no workspaces', async () => {
      (prisma.workspaceMember.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.invoice.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.findAllForUser('user-no-workspaces');

      expect(result).toHaveLength(0);
    });

    it('should correctly calculate invoice status as overdue', async () => {
      const overdueInvoice = {
        ...mockInvoice,
        status: 'pending',
        paidAt: null,
        dueDate: new Date('2020-01-01'), // Past due date
      };

      (prisma.workspaceMember.findMany as jest.Mock).mockResolvedValue([
        { workspaceId: 'workspace-123' },
      ]);
      (prisma.invoice.findMany as jest.Mock).mockResolvedValue([overdueInvoice]);

      const result = await service.findAllForUser('user-123');

      expect(result[0].status).toBe('overdue');
    });

    it('should calculate correct subtotal and tax (19% VAT)', async () => {
      (prisma.workspaceMember.findMany as jest.Mock).mockResolvedValue([
        { workspaceId: 'workspace-123' },
      ]);
      (prisma.invoice.findMany as jest.Mock).mockResolvedValue([mockInvoice]);

      const result = await service.findAllForUser('user-123');

      // 119 EUR total with 19% VAT means subtotal = 100, tax = 19
      expect(result[0].total).toBe(119);
      expect(result[0].subtotal).toBeCloseTo(100, 0);
      expect(result[0].tax).toBeCloseTo(19, 0);
    });
  });

  describe('findOne', () => {
    it('should return invoice when user has access', async () => {
      (prisma.invoice.findUnique as jest.Mock).mockResolvedValue(mockInvoice);

      const result = await service.findOne('user-123', 'invoice-123');

      expect(result.id).toBe('invoice-123');
      expect(result.currency).toBe('EUR');
    });

    it('should throw NotFoundException when invoice does not exist', async () => {
      (prisma.invoice.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.findOne('user-123', 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user has no workspace access', async () => {
      const invoiceNoAccess = {
        ...mockInvoice,
        workspace: { ...mockWorkspace, members: [] },
      };
      (prisma.invoice.findUnique as jest.Mock).mockResolvedValue(invoiceNoAccess);

      await expect(
        service.findOne('user-456', 'invoice-123'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('generatePdf', () => {
    it('should call findOne before generating PDF', async () => {
      (prisma.invoice.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.generatePdf('user-123', 'non-existent'),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.invoice.findUnique).toHaveBeenCalledWith({
        where: { id: 'non-existent' },
        include: expect.any(Object),
      });
    });

    it('should generate a PDF buffer for paid invoice', async () => {
      (prisma.invoice.findUnique as jest.Mock).mockResolvedValue(mockInvoice);

      const result = await service.generatePdf('user-123', 'invoice-123');

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
      // PDF magic bytes
      expect(result.slice(0, 5).toString()).toBe('%PDF-');
    });

    it('should generate PDF for pending invoice', async () => {
      const pendingInvoice = {
        ...mockInvoice,
        status: 'pending',
        paidAt: null,
        dueDate: new Date('2030-12-31'), // Future due date
      };
      (prisma.invoice.findUnique as jest.Mock).mockResolvedValue(pendingInvoice);

      const result = await service.generatePdf('user-123', 'invoice-123');

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should generate PDF for overdue invoice', async () => {
      const overdueInvoice = {
        ...mockInvoice,
        status: 'pending',
        paidAt: null,
        dueDate: new Date('2020-01-01'), // Past due date
      };
      (prisma.invoice.findUnique as jest.Mock).mockResolvedValue(overdueInvoice);

      const result = await service.generatePdf('user-123', 'invoice-123');

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle different currencies in PDF', async () => {
      const usdInvoice = {
        ...mockInvoice,
        currency: 'usd',
        amount: 99.99,
      };
      (prisma.invoice.findUnique as jest.Mock).mockResolvedValue(usdInvoice);

      const result = await service.generatePdf('user-123', 'invoice-123');

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle invoice without user name', async () => {
      const invoiceNoUserName = {
        ...mockInvoice,
        workspace: {
          ...mockWorkspace,
          members: [{ userId: 'user-123', user: { id: 'user-123', email: 'test@example.com', name: null } }],
        },
      };
      (prisma.invoice.findUnique as jest.Mock).mockResolvedValue(invoiceNoUserName);

      const result = await service.generatePdf('user-123', 'invoice-123');

      expect(result).toBeInstanceOf(Buffer);
    });
  });

  describe('mapInvoiceToDetails (via findOne)', () => {
    it('should format German dates correctly', async () => {
      const januaryInvoice = {
        ...mockInvoice,
        createdAt: new Date('2026-01-15'),
      };
      (prisma.invoice.findUnique as jest.Mock).mockResolvedValue(januaryInvoice);

      const result = await service.findOne('user-123', 'invoice-123');

      expect(result.date).toBe('15. Januar 2026');
    });

    it('should generate invoice number from date and id', async () => {
      (prisma.invoice.findUnique as jest.Mock).mockResolvedValue(mockInvoice);

      const result = await service.findOne('user-123', 'invoice-123');

      // Invoice number format: INV-YYYY-NNNN (4+ digits)
      expect(result.number).toMatch(/^INV-2026-\d+$/);
    });

    it('should calculate CO2 savings', async () => {
      (prisma.invoice.findUnique as jest.Mock).mockResolvedValue(mockInvoice);

      const result = await service.findOne('user-123', 'invoice-123');

      // CO2 saved = amount * 0.8
      expect(result.co2Saved).toBeCloseTo(119 * 0.8, 1);
    });

    it('should handle invoice with default currency when not specified', async () => {
      const invoiceNoCurrency = {
        ...mockInvoice,
        currency: null,
      };
      (prisma.invoice.findUnique as jest.Mock).mockResolvedValue(invoiceNoCurrency);

      const result = await service.findOne('user-123', 'invoice-123');

      expect(result.currency).toBe('EUR');
    });

    it('should calculate due date 14 days after creation when not specified', async () => {
      const invoiceNoDueDate = {
        ...mockInvoice,
        dueDate: null,
        createdAt: new Date('2026-02-01'),
      };
      (prisma.invoice.findUnique as jest.Mock).mockResolvedValue(invoiceNoDueDate);

      const result = await service.findOne('user-123', 'invoice-123');

      expect(result.dueDate).toBe('15. Februar 2026');
    });
  });

  describe('seedDemoInvoices', () => {
    it('should create demo invoices for existing user with workspaces', async () => {
      const userWithWorkspace = {
        ...mockUser,
        workspaceMemberships: [{ workspaceId: 'workspace-123', workspace: mockWorkspace }],
      };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(userWithWorkspace);
      (prisma.invoice.create as jest.Mock).mockResolvedValue(mockInvoice);

      await service.seedDemoInvoices('test@example.com');

      expect(prisma.invoice.create).toHaveBeenCalledTimes(3);
    });

    it('should not create invoices when user has no workspaces', async () => {
      const userNoWorkspaces = {
        ...mockUser,
        workspaceMemberships: [],
      };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(userNoWorkspaces);

      await service.seedDemoInvoices('test@example.com');

      expect(prisma.invoice.create).not.toHaveBeenCalled();
    });

    it('should not create invoices when user does not exist', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await service.seedDemoInvoices('nonexistent@example.com');

      expect(prisma.invoice.create).not.toHaveBeenCalled();
    });
  });
});
