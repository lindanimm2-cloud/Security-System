import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const tenants = await this.prisma.tenant.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        primaryColor: true,
        contactEmail: true,
        createdAt: true,
      },
      orderBy: { name: 'asc' },
    });

    return { success: true, data: tenants };
  }
}
