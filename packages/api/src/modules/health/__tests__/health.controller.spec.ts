import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from '../health.controller';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  describe('check', () => {
    it('should return health status', () => {
      const result = controller.check();

      expect(result).toHaveProperty('status', 'ok');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('uptime');
      expect(result).toHaveProperty('service', 'kubidu-api');
    });
  });

  describe('ready', () => {
    it('should return ready status', () => {
      const result = controller.ready();

      expect(result).toHaveProperty('status', 'ready');
      expect(result).toHaveProperty('timestamp');
    });
  });

  describe('live', () => {
    it('should return alive status', () => {
      const result = controller.live();

      expect(result).toHaveProperty('status', 'alive');
      expect(result).toHaveProperty('timestamp');
    });
  });
});
