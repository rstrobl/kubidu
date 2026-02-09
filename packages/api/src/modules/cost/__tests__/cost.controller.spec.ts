import { Test, TestingModule } from '@nestjs/testing';
import { CostController } from '../cost.controller';
import { CostService } from '../cost.service';

describe('CostController', () => {
  let controller: CostController;
  let costService: jest.Mocked<CostService>;

  const mockCostEstimate = {
    totalCost: 5000,
    currency: 'USD',
    breakdown: {
      compute: 3000,
      storage: 1000,
      bandwidth: 1000,
    },
  };

  beforeEach(async () => {
    const mockCostService = {
      getCostEstimate: jest.fn(),
      getProjectCost: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CostController],
      providers: [
        { provide: CostService, useValue: mockCostService },
      ],
    }).compile();

    controller = module.get<CostController>(CostController);
    costService = module.get(CostService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getWorkspaceCost', () => {
    it('should return cost estimate for a workspace', async () => {
      costService.getCostEstimate.mockResolvedValue(mockCostEstimate as any);

      const result = await controller.getWorkspaceCost(
        'workspace-123',
        { user: { id: 'user-123' } },
      );

      expect(result).toEqual(mockCostEstimate);
      expect(costService.getCostEstimate).toHaveBeenCalledWith('workspace-123', 'user-123');
    });
  });

  describe('getProjectCost', () => {
    it('should return cost breakdown for a project', async () => {
      costService.getProjectCost.mockResolvedValue(mockCostEstimate as any);

      const result = await controller.getProjectCost(
        'project-123',
        { user: { id: 'user-123' } },
      );

      expect(result).toEqual(mockCostEstimate);
      expect(costService.getProjectCost).toHaveBeenCalledWith('project-123', 'user-123');
    });
  });
});
