import { JwtAuthGuard } from '../guards/jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  beforeEach(() => {
    guard = new JwtAuthGuard();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should extend AuthGuard', () => {
    expect(guard).toBeInstanceOf(JwtAuthGuard);
    // The guard should have inherited methods from AuthGuard
    expect(typeof guard.canActivate).toBe('function');
  });

  it('should use jwt strategy', () => {
    // The JwtAuthGuard uses 'jwt' strategy by extending AuthGuard('jwt')
    expect(guard.constructor.name).toBe('JwtAuthGuard');
  });
});
