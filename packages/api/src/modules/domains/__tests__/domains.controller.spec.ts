import { Test, TestingModule } from '@nestjs/testing';
import { DomainsController } from '../domains.controller';
import { DomainsService } from '../domains.service';

describe('DomainsController', () => {
  let controller: DomainsController;
  let domainsService: jest.Mocked<DomainsService>;

  const mockDomain = {
    id: 'domain-123',
    domain: 'example.com',
    serviceId: 'service-123',
    isVerified: true,
    verifiedAt: new Date(),
    verificationCode: 'abc123',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockDomainsService = {
      findAll: jest.fn(),
      create: jest.fn(),
      verify: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DomainsController],
      providers: [
        { provide: DomainsService, useValue: mockDomainsService },
      ],
    }).compile();

    controller = module.get<DomainsController>(DomainsController);
    domainsService = module.get(DomainsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all domains for a service', async () => {
      domainsService.findAll.mockResolvedValue([mockDomain] as any);

      const result = await controller.findAll(
        { user: { id: 'user-123' } },
        'service-123',
      );

      expect(result).toHaveLength(1);
      expect(domainsService.findAll).toHaveBeenCalledWith('user-123', 'service-123');
    });
  });

  describe('create', () => {
    it('should create a new domain', async () => {
      const createDto = { domain: 'example.com' };
      domainsService.create.mockResolvedValue(mockDomain as any);

      const result = await controller.create(
        { user: { id: 'user-123' } },
        'service-123',
        createDto as any,
      );

      expect(result).toEqual(mockDomain);
      expect(domainsService.create).toHaveBeenCalledWith('user-123', 'service-123', createDto);
    });
  });

  describe('verify', () => {
    it('should verify a domain', async () => {
      const verifiedDomain = { ...mockDomain, isVerified: true };
      domainsService.verify.mockResolvedValue(verifiedDomain as any);

      const result = await controller.verify(
        { user: { id: 'user-123' } },
        'domain-123',
      );

      expect(result.isVerified).toBe(true);
      expect(domainsService.verify).toHaveBeenCalledWith('user-123', 'domain-123');
    });
  });

  describe('delete', () => {
    it('should delete a domain', async () => {
      domainsService.delete.mockResolvedValue(undefined);

      const result = await controller.delete(
        { user: { id: 'user-123' } },
        'domain-123',
      );

      expect(result.message).toBe('Domain deleted successfully');
      expect(domainsService.delete).toHaveBeenCalledWith('user-123', 'domain-123');
    });
  });
});
