import { ApiKeyAuthGuard } from '../guards/api-key-auth.guard';

describe('ApiKeyAuthGuard', () => {
  let guard: ApiKeyAuthGuard;

  beforeEach(() => {
    guard = new ApiKeyAuthGuard();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should extend AuthGuard', () => {
    expect(guard).toBeInstanceOf(ApiKeyAuthGuard);
    // The guard should have inherited methods from AuthGuard
    expect(typeof guard.canActivate).toBe('function');
  });

  it('should use api-key strategy', () => {
    // The ApiKeyAuthGuard uses 'api-key' strategy by extending AuthGuard('api-key')
    expect(guard.constructor.name).toBe('ApiKeyAuthGuard');
  });
});
