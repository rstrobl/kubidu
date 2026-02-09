import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from '../audit.service';
import { PrismaService } from '../../../database/prisma.service';

describe('AuditService', () => {
  let service: AuditService;
  let prisma: jest.Mocked<PrismaService>;

  const mockAuditLog = {
    id: 'audit-123',
    userId: 'user-123',
    action: 'deployment.created',
    resourceType: 'deployment',
    resourceId: 'deployment-123',
    metadata: { serviceId: 'service-123' },
    ipAddress: '127.0.0.1',
    userAgent: 'Mozilla/5.0',
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const mockPrisma = {
      auditLog: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
    prisma = module.get(PrismaService);
  });

  describe('getLogs', () => {
    it('should return audit logs for a user', async () => {
      (prisma.auditLog.findMany as jest.Mock).mockResolvedValue([mockAuditLog]);

      const result = await service.getLogs('user-123');

      expect(result).toHaveLength(1);
      expect(result[0].action).toBe('deployment.created');
    });

    it('should filter logs by date range', async () => {
      (prisma.auditLog.findMany as jest.Mock).mockResolvedValue([mockAuditLog]);

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      await service.getLogs('user-123', { startDate, endDate });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-123',
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          }),
        }),
      );
    });

    it('should filter logs by action', async () => {
      (prisma.auditLog.findMany as jest.Mock).mockResolvedValue([mockAuditLog]);

      await service.getLogs('user-123', { action: 'deployment' });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            action: { contains: 'deployment' },
          }),
        }),
      );
    });

    it('should respect limit option', async () => {
      (prisma.auditLog.findMany as jest.Mock).mockResolvedValue([mockAuditLog]);

      await service.getLogs('user-123', { limit: 50 });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
        }),
      );
    });
  });

  describe('getStats', () => {
    it('should return audit statistics', async () => {
      (prisma.auditLog.findMany as jest.Mock).mockResolvedValue([
        { ...mockAuditLog, action: 'deployment.created' },
        { ...mockAuditLog, action: 'deployment.created' },
        { ...mockAuditLog, action: 'service.updated' },
      ]);

      const result = await service.getStats('user-123', 30);

      expect(result.total).toBe(3);
      expect(result.byAction['deployment.created']).toBe(2);
      expect(result.byAction['service.updated']).toBe(1);
    });

    it('should return empty stats when no logs', async () => {
      (prisma.auditLog.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getStats('user-123');

      expect(result.total).toBe(0);
      expect(result.byAction).toEqual({});
    });
  });
});
