import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../database/prisma.service';
import { maskSensitiveData } from '@kubidu/shared';

@Injectable()
export class AuditLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger(AuditLoggerMiddleware.name);

  constructor(
    private readonly prisma: PrismaService,
  ) {}

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();

    // Capture the original send function and the middleware context
    const originalSend = res.send;
    const middleware = this;

    res.send = function (data: any) {
      res.send = originalSend;

      // Only audit state-changing operations
      const shouldAudit = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);

      if (shouldAudit && !req.path.includes('/health')) {
        const duration = Date.now() - startTime;
        const user = req.user;

        // Async audit logging (fire and forget)
        setImmediate(async () => {
          try {
            await middleware.prisma.auditLog.create({
              data: {
                userId: (user as any)?.id || null,
                action: `${req.method} ${req.path}`,
                resource: middleware.extractResourceType(req.path) || 'unknown',
                resourceId: middleware.extractResourceId(req.path),
                ipAddress: req.ip || req.socket.remoteAddress || null,
                userAgent: req.headers['user-agent'] || null,
                metadata: {
                  statusCode: res.statusCode,
                  duration,
                  query: req.query,
                  body: maskSensitiveData(req.body),
                },
              },
            });
          } catch (error) {
            middleware.logger.error('Failed to write audit log', error);
          }
        });
      }

      return originalSend.call(this, data);
    };

    next();
  }

  private extractResourceType(path: string): string | null {
    const match = path.match(/\/api\/([^\/]+)/);
    return match ? match[1] : null;
  }

  private extractResourceId(path: string): string | null {
    // Match UUID patterns in the path
    const match = path.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    return match ? match[0] : null;
  }
}
