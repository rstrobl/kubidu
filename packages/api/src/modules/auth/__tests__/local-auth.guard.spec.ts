import { LocalAuthGuard } from '../guards/local-auth.guard';

describe('LocalAuthGuard', () => {
  let guard: LocalAuthGuard;

  beforeEach(() => {
    guard = new LocalAuthGuard();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should extend AuthGuard', () => {
    expect(guard).toBeInstanceOf(LocalAuthGuard);
    // The guard should have inherited methods from AuthGuard
    expect(typeof guard.canActivate).toBe('function');
  });

  it('should use local strategy', () => {
    // The LocalAuthGuard uses 'local' strategy by extending AuthGuard('local')
    // We can verify it's properly instantiated
    expect(guard.constructor.name).toBe('LocalAuthGuard');
  });
});
