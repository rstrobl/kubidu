import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OverviewTab } from './OverviewTab';
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

describe('OverviewTab', () => {
  describe('Service Information section', () => {
    it('should render service name', () => {
      const service = createService({ name: 'My Awesome Service' });
      render(<OverviewTab service={service} />);

      expect(screen.getByText('My Awesome Service')).toBeInTheDocument();
    });

    it('should render service type', () => {
      const service = createService({ serviceType: 'DOCKER_IMAGE' });
      render(<OverviewTab service={service} />);

      expect(screen.getByText('DOCKER_IMAGE')).toBeInTheDocument();
    });

    it('should render default port', () => {
      const service = createService({ defaultPort: 3000 });
      render(<OverviewTab service={service} />);

      expect(screen.getByText('3000')).toBeInTheDocument();
    });

    it('should render default replicas', () => {
      const service = createService({ defaultReplicas: 3 });
      render(<OverviewTab service={service} />);

      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  describe('GitHub service', () => {
    it('should render repository URL for GitHub services', () => {
      const service = createService({
        serviceType: 'GITHUB',
        repositoryUrl: 'https://github.com/user/repo',
        repositoryBranch: 'main',
      });
      render(<OverviewTab service={service} />);

      expect(screen.getByText('https://github.com/user/repo')).toBeInTheDocument();
      expect(screen.getByText('main')).toBeInTheDocument();
    });

    it('should default branch to main if not specified', () => {
      const service = createService({
        serviceType: 'GITHUB',
        repositoryUrl: 'https://github.com/user/repo',
      });
      render(<OverviewTab service={service} />);

      expect(screen.getByText('main')).toBeInTheDocument();
    });
  });

  describe('Docker service', () => {
    it('should render Docker image for Docker services', () => {
      const service = createService({
        serviceType: 'DOCKER_IMAGE',
        dockerImage: 'nginx',
        dockerTag: '1.25',
      });
      render(<OverviewTab service={service} />);

      expect(screen.getByText('nginx')).toBeInTheDocument();
      expect(screen.getByText('1.25')).toBeInTheDocument();
    });

    it('should default tag to latest if not specified', () => {
      const service = createService({
        serviceType: 'DOCKER_IMAGE',
        dockerImage: 'nginx',
      });
      render(<OverviewTab service={service} />);

      expect(screen.getByText('latest')).toBeInTheDocument();
    });
  });

  describe('Template service', () => {
    it('should render Template badge for template services', () => {
      const service = createService({ templateDeploymentId: 'template-123' });
      render(<OverviewTab service={service} />);

      expect(screen.getByText('Template')).toBeInTheDocument();
    });
  });

  describe('Resource Limits section', () => {
    it('should render CPU limit', () => {
      const service = createService({ defaultCpuLimit: '1000m' });
      render(<OverviewTab service={service} />);

      expect(screen.getByText('1000m')).toBeInTheDocument();
    });

    it('should render memory limit', () => {
      const service = createService({ defaultMemoryLimit: '1Gi' });
      render(<OverviewTab service={service} />);

      expect(screen.getByText('1Gi')).toBeInTheDocument();
    });

    it('should render CPU request', () => {
      const service = createService({ defaultCpuRequest: '250m' });
      render(<OverviewTab service={service} />);

      expect(screen.getByText('250m')).toBeInTheDocument();
    });

    it('should render memory request', () => {
      const service = createService({ defaultMemoryRequest: '256Mi' });
      render(<OverviewTab service={service} />);

      expect(screen.getByText('256Mi')).toBeInTheDocument();
    });

    it('should render health check path', () => {
      const service = createService({ defaultHealthCheckPath: '/api/health' });
      render(<OverviewTab service={service} />);

      expect(screen.getByText('/api/health')).toBeInTheDocument();
    });
  });

  describe('Public URL section', () => {
    it('should render public URL when available', () => {
      const service = createService({ url: 'https://myapp.example.com' });
      render(<OverviewTab service={service} />);

      const links = screen.getAllByRole('link', { name: /https:\/\/myapp.example.com/i });
      expect(links.length).toBeGreaterThan(0);
      expect(links[0]).toHaveAttribute('href', 'https://myapp.example.com');
      expect(links[0]).toHaveAttribute('target', '_blank');
    });

    it('should render Visit Site button when URL is available', () => {
      const service = createService({ url: 'https://myapp.example.com' });
      render(<OverviewTab service={service} />);

      expect(screen.getByText(/Visit Site/)).toBeInTheDocument();
    });

    it('should not render public URL section when no URL', () => {
      const service = createService({ url: undefined });
      render(<OverviewTab service={service} />);

      expect(screen.queryByText('Public URL')).not.toBeInTheDocument();
    });
  });
});
