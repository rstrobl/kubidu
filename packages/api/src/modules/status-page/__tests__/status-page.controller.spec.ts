import { Test, TestingModule } from '@nestjs/testing';
import { StatusPageController, IncidentsController } from '../status-page.controller';
import { StatusPageService } from '../status-page.service';

describe('StatusPageController', () => {
  let controller: StatusPageController;
  let statusPageService: jest.Mocked<StatusPageService>;

  const mockPublicStatus = {
    overall: 'operational',
    services: [
      { name: 'API', status: 'operational' },
      { name: 'Web', status: 'operational' },
    ],
    incidents: [],
  };

  beforeEach(async () => {
    const mockStatusPageService = {
      getPublicStatus: jest.fn(),
      subscribe: jest.fn(),
      confirmSubscription: jest.fn(),
      createIncident: jest.fn(),
      updateIncident: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StatusPageController],
      providers: [
        { provide: StatusPageService, useValue: mockStatusPageService },
      ],
    }).compile();

    controller = module.get<StatusPageController>(StatusPageController);
    statusPageService = module.get(StatusPageService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getPublicStatus', () => {
    it('should return public status for a project', async () => {
      statusPageService.getPublicStatus.mockResolvedValue(mockPublicStatus as any);

      const result = await controller.getPublicStatus('my-workspace', 'my-project');

      expect(result).toEqual(mockPublicStatus);
      expect(statusPageService.getPublicStatus).toHaveBeenCalledWith('my-workspace', 'my-project');
    });
  });

  describe('subscribe', () => {
    it('should subscribe an email to status updates', async () => {
      statusPageService.subscribe.mockResolvedValue({ message: 'Confirmation email sent' } as any);

      const result = await controller.subscribe('my-workspace', 'my-project', 'user@example.com');

      expect(result.message).toBe('Confirmation email sent');
      expect(statusPageService.subscribe).toHaveBeenCalledWith('my-workspace', 'my-project', 'user@example.com');
    });
  });

  describe('confirmSubscription', () => {
    it('should confirm a subscription with token', async () => {
      statusPageService.confirmSubscription.mockResolvedValue({ message: 'Subscription confirmed' });

      const result = await controller.confirmSubscription('confirmation-token');

      expect(result).toEqual({ message: 'Subscription confirmed' });
      expect(statusPageService.confirmSubscription).toHaveBeenCalledWith('confirmation-token');
    });
  });
});

describe('IncidentsController', () => {
  let controller: IncidentsController;
  let statusPageService: jest.Mocked<StatusPageService>;

  const mockIncident = {
    id: 'incident-123',
    title: 'API Outage',
    message: 'The API is experiencing issues',
    severity: 'MAJOR',
    status: 'INVESTIGATING',
    affectedServiceIds: ['service-123'],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockStatusPageService = {
      createIncident: jest.fn(),
      updateIncident: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [IncidentsController],
      providers: [
        { provide: StatusPageService, useValue: mockStatusPageService },
      ],
    }).compile();

    controller = module.get<IncidentsController>(IncidentsController);
    statusPageService = module.get(StatusPageService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createIncident', () => {
    it('should create a new incident', async () => {
      const createBody = {
        title: 'API Outage',
        message: 'The API is experiencing issues',
        severity: 'MAJOR' as const,
        affectedServiceIds: ['service-123'],
      };
      statusPageService.createIncident.mockResolvedValue(mockIncident as any);

      const result = await controller.createIncident(
        'project-123',
        { user: { id: 'user-123' } },
        createBody,
      );

      expect(result).toEqual(mockIncident);
      expect(statusPageService.createIncident).toHaveBeenCalledWith('project-123', 'user-123', createBody);
    });
  });

  describe('updateIncident', () => {
    it('should update an incident status', async () => {
      const updateBody = {
        status: 'RESOLVED' as const,
        message: 'Issue has been resolved',
      };
      statusPageService.updateIncident.mockResolvedValue({ message: 'Incident updated' } as any);

      const result = await controller.updateIncident('incident-123', updateBody);

      expect(result.message).toBe('Incident updated');
      expect(statusPageService.updateIncident).toHaveBeenCalledWith('incident-123', updateBody);
    });
  });
});
