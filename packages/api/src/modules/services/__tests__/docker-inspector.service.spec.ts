import { Test, TestingModule } from '@nestjs/testing';
import { DockerInspectorService } from '../docker-inspector.service';

// Since the service relies on exec, we test via integration-style tests
// Mocking child_process at module level is complex due to hoisting

describe('DockerInspectorService', () => {
  let service: DockerInspectorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DockerInspectorService],
    }).compile();

    service = module.get<DockerInspectorService>(DockerInspectorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getExposedPort', () => {
    it('should return null when image inspection fails', async () => {
      // This test covers the error handling path
      // Using an invalid image name that definitely doesn't exist
      const result = await service.getExposedPort('nonexistent-image-12345');
      expect(result).toBeNull();
    });

    it('should handle image with colon in name', async () => {
      const result = await service.getExposedPort('invalid:image:name');
      expect(result).toBeNull();
    });
  });

  describe('getAllExposedPorts', () => {
    it('should return empty array when image inspection fails', async () => {
      // This test covers the error handling path
      const result = await service.getAllExposedPorts('nonexistent-image-12345');
      expect(result).toEqual([]);
    });

    it('should handle image with special characters', async () => {
      const result = await service.getAllExposedPorts('image@#$%');
      expect(result).toEqual([]);
    });
  });
});
