import { Injectable } from '@nestjs/common';
import { AuditLog } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AuditService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async getLogs(
    userId: string,
    options: {
      startDate?: Date;
      endDate?: Date;
      action?: string;
      limit?: number;
    } = {},
  ): Promise<AuditLog[]> {
    const { startDate, endDate, action, limit = 100 } = options;

    const where: any = { userId };

    if (startDate && endDate) {
      where.createdAt = {
        gte: startDate,
        lte: endDate,
      };
    }

    if (action) {
      where.action = { contains: action };
    }

    return this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getStats(userId: string, days: number = 30): Promise<any> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const logs = await this.prisma.auditLog.findMany({
      where: {
        userId,
        createdAt: {
          gte: startDate,
          lte: new Date(),
        },
      },
    });

    const stats = {
      total: logs.length,
      byAction: {} as Record<string, number>,
    };

    logs.forEach((log) => {
      // Count by action
      stats.byAction[log.action] = (stats.byAction[log.action] || 0) + 1;
    });

    return stats;
  }
}
