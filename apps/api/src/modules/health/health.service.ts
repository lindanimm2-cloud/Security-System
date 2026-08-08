import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  getHealth() {
    return {
      success: true,
      data: {
        status: 'ok',
        service: '4ds-solutions-api',
        timestamp: new Date().toISOString(),
      },
    };
  }

  async getReadiness() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        success: true,
        data: {
          status: 'ready',
          checks: { database: 'up' },
          timestamp: new Date().toISOString(),
        },
      };
    } catch {
      return {
        success: false,
        data: {
          status: 'not_ready',
          checks: { database: 'down' },
          timestamp: new Date().toISOString(),
        },
      };
    }
  }
}
