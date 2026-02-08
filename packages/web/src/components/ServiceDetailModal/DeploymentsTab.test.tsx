import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DeploymentsTab } from './DeploymentsTab';
import { Deployment } from './types';

const createDeployment = (overrides: Partial<Deployment> = {}): Deployment => ({
  id: 'deploy-1',
  name: 'test-deployment',
  status: 'RUNNING',
  createdAt: new Date().toISOString(),
  ...overrides,
});

describe('DeploymentsTab', () => {
  const defaultProps = {
    deployments: [],
    selectedDeploymentLogs: null,
    logs: '',
    buildLogs: '',
    logsLoading: false,
    logType: 'runtime' as const,
    retryingDeployment: null,
    onViewLogs: vi.fn(),
    onChangeLogType: vi.fn(),
    onRetryDeployment: vi.fn(),
  };

  it('should render empty state when no deployments', () => {
    render(<DeploymentsTab {...defaultProps} />);

    expect(screen.getByText('No deployments yet')).toBeInTheDocument();
  });

  it('should render deployment list', () => {
    const deployments = [
      createDeployment({ id: 'deploy-1', gitCommitSha: 'abc1234', gitCommitMessage: 'Initial commit' }),
      createDeployment({ id: 'deploy-2', gitCommitSha: 'def5678', gitCommitMessage: 'Fix bug' }),
    ];

    render(<DeploymentsTab {...defaultProps} deployments={deployments} />);

    expect(screen.getByText(/abc1234.*Initial commit/)).toBeInTheDocument();
    expect(screen.getByText(/def5678.*Fix bug/)).toBeInTheDocument();
  });

  describe('deployment labels', () => {
    it('should show image:tag for docker deployments', () => {
      const deployment = createDeployment({
        imageUrl: 'myimage',
        imageTag: 'v1.0',
      });

      render(<DeploymentsTab {...defaultProps} deployments={[deployment]} />);

      expect(screen.getByText('myimage:v1.0')).toBeInTheDocument();
    });

    it('should show commit hash and message for git deployments', () => {
      const deployment = createDeployment({
        gitCommitSha: 'abcdef123456',
        gitCommitMessage: 'Add new feature',
      });

      render(<DeploymentsTab {...defaultProps} deployments={[deployment]} />);

      // Should show short commit hash
      expect(screen.getByText(/abcdef1.*Add new feature/)).toBeInTheDocument();
    });

    it('should fallback to deployment name', () => {
      const deployment = createDeployment({ name: 'my-deployment' });

      render(<DeploymentsTab {...defaultProps} deployments={[deployment]} />);

      expect(screen.getByText('my-deployment')).toBeInTheDocument();
    });
  });

  describe('status badges', () => {
    it('should show Active badge for active deployment', () => {
      const deployment = createDeployment({ isActive: true });

      render(<DeploymentsTab {...defaultProps} deployments={[deployment]} />);

      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('should show RUNNING status with green styling', () => {
      const deployment = createDeployment({ status: 'RUNNING' });

      render(<DeploymentsTab {...defaultProps} deployments={[deployment]} />);

      const badge = screen.getByText('RUNNING');
      expect(badge).toHaveClass('bg-green-100', 'text-green-800');
    });

    it('should show PENDING status with yellow styling', () => {
      const deployment = createDeployment({ status: 'PENDING' });

      render(<DeploymentsTab {...defaultProps} deployments={[deployment]} />);

      const badge = screen.getByText('PENDING');
      expect(badge).toHaveClass('bg-yellow-100', 'text-yellow-800');
    });

    it('should show FAILED status with red styling', () => {
      const deployment = createDeployment({ status: 'FAILED' });

      render(<DeploymentsTab {...defaultProps} deployments={[deployment]} />);

      const badge = screen.getByText('FAILED');
      expect(badge).toHaveClass('bg-red-100', 'text-red-800');
    });

    it('should show STOPPED status with gray styling', () => {
      const deployment = createDeployment({ status: 'STOPPED' });

      render(<DeploymentsTab {...defaultProps} deployments={[deployment]} />);

      const badge = screen.getByText('STOPPED');
      expect(badge).toHaveClass('bg-gray-100', 'text-gray-600');
    });
  });

  describe('action buttons', () => {
    it('should show Retry button for failed deployments', () => {
      const deployment = createDeployment({ status: 'FAILED' });

      render(<DeploymentsTab {...defaultProps} deployments={[deployment]} />);

      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    it('should show Redeploy button for stopped deployments', () => {
      const deployment = createDeployment({ status: 'STOPPED' });

      render(<DeploymentsTab {...defaultProps} deployments={[deployment]} />);

      expect(screen.getByText('Redeploy')).toBeInTheDocument();
    });

    it('should show Redeploy button for crashed deployments', () => {
      const deployment = createDeployment({ status: 'CRASHED' });

      render(<DeploymentsTab {...defaultProps} deployments={[deployment]} />);

      expect(screen.getByText('Redeploy')).toBeInTheDocument();
    });

    it('should call onRetryDeployment when Retry is clicked', () => {
      const onRetryDeployment = vi.fn();
      const deployment = createDeployment({ status: 'FAILED' });

      render(<DeploymentsTab {...defaultProps} deployments={[deployment]} onRetryDeployment={onRetryDeployment} />);

      fireEvent.click(screen.getByText('Retry'));
      expect(onRetryDeployment).toHaveBeenCalledWith('deploy-1');
    });

    it('should disable buttons while retrying', () => {
      const deployment = createDeployment({ id: 'deploy-1', status: 'FAILED' });

      render(<DeploymentsTab {...defaultProps} deployments={[deployment]} retryingDeployment="deploy-1" />);

      expect(screen.getByText('Retrying...')).toBeDisabled();
    });
  });

  describe('View Logs button', () => {
    it('should be disabled for PENDING deployments', () => {
      const deployment = createDeployment({ status: 'PENDING' });

      render(<DeploymentsTab {...defaultProps} deployments={[deployment]} />);

      expect(screen.getByText('View Logs')).toBeDisabled();
    });

    it('should call onViewLogs with build type for BUILDING status', () => {
      const onViewLogs = vi.fn();
      const deployment = createDeployment({ status: 'BUILDING' });

      render(<DeploymentsTab {...defaultProps} deployments={[deployment]} onViewLogs={onViewLogs} />);

      fireEvent.click(screen.getByText('View Logs'));
      expect(onViewLogs).toHaveBeenCalledWith('deploy-1', 'build');
    });

    it('should call onViewLogs with runtime type for RUNNING status', () => {
      const onViewLogs = vi.fn();
      const deployment = createDeployment({ status: 'RUNNING' });

      render(<DeploymentsTab {...defaultProps} deployments={[deployment]} onViewLogs={onViewLogs} />);

      fireEvent.click(screen.getByText('View Logs'));
      expect(onViewLogs).toHaveBeenCalledWith('deploy-1', 'runtime');
    });
  });

  describe('logs panel', () => {
    it('should show logs when deployment is selected', () => {
      const deployment = createDeployment({ id: 'deploy-1', status: 'RUNNING' });

      render(
        <DeploymentsTab
          {...defaultProps}
          deployments={[deployment]}
          selectedDeploymentLogs="deploy-1"
          logs="Application started successfully"
        />
      );

      expect(screen.getByText('Application started successfully')).toBeInTheDocument();
    });

    it('should show build logs when build type is selected', () => {
      const deployment = createDeployment({ id: 'deploy-1', status: 'RUNNING' });

      render(
        <DeploymentsTab
          {...defaultProps}
          deployments={[deployment]}
          selectedDeploymentLogs="deploy-1"
          buildLogs="Building image..."
          logType="build"
        />
      );

      expect(screen.getByText('Building image...')).toBeInTheDocument();
    });

    it('should show log type toggle buttons', () => {
      const deployment = createDeployment({ id: 'deploy-1', status: 'RUNNING' });

      render(
        <DeploymentsTab
          {...defaultProps}
          deployments={[deployment]}
          selectedDeploymentLogs="deploy-1"
        />
      );

      expect(screen.getByText('Runtime Logs')).toBeInTheDocument();
      expect(screen.getByText('Build Logs')).toBeInTheDocument();
    });

    it('should call onChangeLogType when toggling log type', () => {
      const onChangeLogType = vi.fn();
      const deployment = createDeployment({ id: 'deploy-1', status: 'RUNNING' });

      render(
        <DeploymentsTab
          {...defaultProps}
          deployments={[deployment]}
          selectedDeploymentLogs="deploy-1"
          onChangeLogType={onChangeLogType}
        />
      );

      fireEvent.click(screen.getByText('Build Logs'));
      expect(onChangeLogType).toHaveBeenCalledWith('build', 'deploy-1');
    });

    it('should show placeholder when no logs available', () => {
      const deployment = createDeployment({ id: 'deploy-1', status: 'RUNNING' });

      render(
        <DeploymentsTab
          {...defaultProps}
          deployments={[deployment]}
          selectedDeploymentLogs="deploy-1"
          logs=""
        />
      );

      expect(screen.getByText('No runtime logs available')).toBeInTheDocument();
    });
  });
});
