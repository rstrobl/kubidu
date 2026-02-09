import { Test, TestingModule } from '@nestjs/testing';
import { AuditController } from '../audit.controller';
import { AuditService } from '../audit.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

describe('AuditController', () => {
  let controller: AuditController;
  let auditService: AuditService;

  const mockAuditService = {
    getLogs: jest.fn(),
    getStats: jest.fn(),
  };

  const mockRequest = {
    user: { id: 'user-123', email: 'test@example.com' },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditController],
      providers: [
        { provide: AuditService, useValue: mockAuditService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuditController>(AuditController);
    auditService = module.get(AuditService);
  });

  describe('getLogs', () => {
    it('should return audit logs with all filters', async () => {
      const logs = [
        {
          id: 'log-1',
          action: 'CREATE_SERVICE',
          timestamp: new Date('2024-01-15'),
          metadata: { serviceName: 'api' },
        },
      ];
      mockAuditService.getLogs.mockResolvedValue(logs);

      const result = await controller.getLogs(
        mockRequest as any,
        '2024-01-01',
        '2024-01-31',
        'CREATE_SERVICE',
        50,
      );

      expect(result).toEqual(logs);
      expect(mockAuditService.getLogs).toHaveBeenCalledWith('user-123', {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        action: 'CREATE_SERVICE',
        limit: 50,
      });
    });

    it('should handle missing optional parameters', async () => {
      mockAuditService.getLogs.mockResolvedValue([]);

      await controller.getLogs(mockRequest as any);

      expect(mockAuditService.getLogs).toHaveBeenCalledWith('user-123', {
        startDate: undefined,
        endDate: undefined,
        action: undefined,
        limit: undefined,
      });
    });

    it('should handle only startDate specified', async () => {
      mockAuditService.getLogs.mockResolvedValue([]);

      await controller.getLogs(mockRequest as any, '2024-01-01');

      expect(mockAuditService.getLogs).toHaveBeenCalledWith('user-123', {
        startDate: new Date('2024-01-01'),
        endDate: undefined,
        action: undefined,
        limit: undefined,
      });
    });
  });

  describe('getStats', () => {
    it('should return audit statistics', async () => {
      const stats = {
        totalActions: 100,
        actionsByType: { CREATE_SERVICE: 20, UPDATE_SERVICE: 30 },
        actionsOverTime: [{ date: '2024-01-01', count: 5 }],
      };
      mockAuditService.getStats.mockResolvedValue(stats);

      const result = await controller.getStats(mockRequest as any, 7);

      expect(result).toEqual(stats);
      expect(mockAuditService.getStats).toHaveBeenCalledWith('user-123', 7);
    });

    it('should use default 30 days when not specified', async () => {
      mockAuditService.getStats.mockResolvedValue({});

      await controller.getStats(mockRequest as any);

      expect(mockAuditService.getStats).toHaveBeenCalledWith('user-123', 30);
    });
  });
});
