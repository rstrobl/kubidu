import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ServiceIcon } from './ServiceIcon';
import { Service } from './types';

const createService = (overrides: Partial<Service> = {}): Service => ({
  id: 'test-service',
  name: 'Test Service',
  serviceType: 'DOCKER_IMAGE',
  status: 'RUNNING',
  defaultPort: 8080,
  defaultReplicas: 1,
  defaultCpuLimit: '500m',
  defaultMemoryLimit: '512Mi',
  defaultCpuRequest: '100m',
  defaultMemoryRequest: '128Mi',
  defaultHealthCheckPath: '/health',
  ...overrides,
});

describe('ServiceIcon', () => {
  describe('database icons', () => {
    it('should render PostgreSQL icon for postgres image', () => {
      const service = createService({ dockerImage: 'postgres:15' });
      render(<ServiceIcon service={service} />);

      const img = screen.getByAltText('PostgreSQL');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', expect.stringContaining('postgresql'));
    });

    it('should render PostgreSQL icon for postgresql in name', () => {
      const service = createService({ name: 'my-postgresql-db' });
      render(<ServiceIcon service={service} />);

      expect(screen.getByAltText('PostgreSQL')).toBeInTheDocument();
    });

    it('should render MySQL icon for mysql image', () => {
      const service = createService({ dockerImage: 'mysql:8' });
      render(<ServiceIcon service={service} />);

      expect(screen.getByAltText('MySQL')).toBeInTheDocument();
    });

    it('should render MySQL icon for mariadb image', () => {
      const service = createService({ dockerImage: 'mariadb:10' });
      render(<ServiceIcon service={service} />);

      expect(screen.getByAltText('MySQL')).toBeInTheDocument();
    });

    it('should render Redis icon for redis image', () => {
      const service = createService({ dockerImage: 'redis:7' });
      render(<ServiceIcon service={service} />);

      expect(screen.getByAltText('Redis')).toBeInTheDocument();
    });

    it('should render MongoDB icon for mongo image', () => {
      const service = createService({ dockerImage: 'mongo:6' });
      render(<ServiceIcon service={service} />);

      expect(screen.getByAltText('MongoDB')).toBeInTheDocument();
    });
  });

  describe('application icons', () => {
    it('should render WordPress icon for wordpress image', () => {
      const service = createService({ dockerImage: 'wordpress:latest' });
      render(<ServiceIcon service={service} />);

      expect(screen.getByAltText('WordPress')).toBeInTheDocument();
    });

    it('should render n8n icon for n8n image', () => {
      const service = createService({ dockerImage: 'n8nio/n8n:latest' });
      render(<ServiceIcon service={service} />);

      expect(screen.getByAltText('n8n')).toBeInTheDocument();
    });

    it('should render Ghost icon for ghost image', () => {
      const service = createService({ dockerImage: 'ghost:5' });
      render(<ServiceIcon service={service} />);

      expect(screen.getByAltText('Ghost')).toBeInTheDocument();
    });

    it('should render Prefect icon for prefect image', () => {
      const service = createService({ dockerImage: 'prefecthq/prefect:2' });
      render(<ServiceIcon service={service} />);

      expect(screen.getByAltText('Prefect')).toBeInTheDocument();
    });

    it('should render Directus icon for directus image', () => {
      const service = createService({ dockerImage: 'directus/directus:latest' });
      render(<ServiceIcon service={service} />);

      expect(screen.getByAltText('Directus')).toBeInTheDocument();
    });
  });

  describe('service type icons', () => {
    it('should render template icon for services from templates', () => {
      const service = createService({ templateDeploymentId: 'template-123' });
      const { container } = render(<ServiceIcon service={service} />);

      // Template services show an SVG with 4 rectangles
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      const rects = svg?.querySelectorAll('rect');
      expect(rects?.length).toBe(4);
    });

    it('should render GitHub icon for GITHUB service type', () => {
      const service = createService({
        serviceType: 'GITHUB',
        repositoryUrl: 'https://github.com/test/repo'
      });
      const { container } = render(<ServiceIcon service={service} />);

      // GitHub services show an SVG (the GitHub logo)
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should render Docker icon as fallback for DOCKER_IMAGE service type', () => {
      const service = createService({ dockerImage: 'custom/image:tag' });
      const { container } = render(<ServiceIcon service={service} />);

      // Docker services show an SVG (the Docker logo)
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });
});
