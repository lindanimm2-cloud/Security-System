import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  InstallJobStatus,
  ProductCategory,
  SalesLeadStatus,
  StockRequestStatus,
  StoreOrderStatus,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { LoyaltyService } from '../client/loyalty.service';
import {
  developerCanViewRevenue,
  REVENUE_HIDDEN_LABEL,
} from '../../common/developer-access';

function money(cents: number) {
  return `R ${(cents / 100).toFixed(2)}`;
}

@Injectable()
export class StoreService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly loyalty: LoyaltyService,
  ) {}

  private async canSeeRevenue(tenantId: string, role?: UserRole) {
    if (!role) return true;
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true },
    });
    return developerCanViewRevenue(role, tenant?.settings);
  }

  private moneyOrHidden(cents: number, allowed: boolean) {
    return allowed ? money(cents) : REVENUE_HIDDEN_LABEL;
  }

  private async resolveTenantId(tenantSlug?: string, tenantId?: string) {
    if (tenantId) return tenantId;
    const slug = tenantSlug ?? 'demo';
    const tenant = await this.prisma.tenant.findFirst({
      where: { slug, isActive: true },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant.id;
  }

  async listProducts(opts: {
    tenantSlug?: string;
    tenantId?: string;
    category?: ProductCategory;
    featuredOnly?: boolean;
    includeInactive?: boolean;
  }) {
    const tenantId = await this.resolveTenantId(opts.tenantSlug, opts.tenantId);
    const products = await this.prisma.product.findMany({
      where: {
        tenantId,
        ...(opts.includeInactive ? {} : { isActive: true }),
        ...(opts.category ? { category: opts.category } : {}),
        ...(opts.featuredOnly ? { featured: true } : {}),
      },
      orderBy: [{ featured: 'desc' }, { category: 'asc' }, { name: 'asc' }],
    });

    const catalogueOrder = [
      'FIREARMS',
      'BODY_ARMOUR',
      'PERSONAL_SECURITY',
      'CCTV',
      'NVR_STORAGE',
      'SMART_HOME',
      'ALARMS',
      'SENSORS',
      'ELECTRIC_FENCING',
      'PERIMETER',
      'ACCESS_CONTROL',
      'GATES',
      'INTERCOMS',
      'GUARD_EQUIPMENT',
      'GUARD_TOUR',
      'VEHICLE_SECURITY',
      'LIGHTING',
      'NETWORKING',
      'POWER',
      'INSTALL_MATERIALS',
      'TOOLS',
      'TECH_EQUIPMENT',
      'SAFES',
      'LOCKS',
      'PHYSICAL_PERIMETER',
      'FIRE_SAFETY',
      'PACKAGES',
      'CONTROL_ROOM',
      'SIGNS',
      'INSPECTION',
      'CYBER',
      'SPARE_PARTS',
    ] as ProductCategory[];

    return {
      success: true,
      data: products.map((p) => ({
        ...p,
        priceFormatted: money(p.priceCents),
      })),
      categories: catalogueOrder,
    };
  }

  async getProduct(id: string, tenantSlug?: string) {
    const tenantId = await this.resolveTenantId(tenantSlug);
    const product = await this.prisma.product.findFirst({
      where: { id, tenantId, isActive: true },
    });
    if (!product) throw new NotFoundException('Product not found');
    return {
      success: true,
      data: { ...product, priceFormatted: money(product.priceCents) },
    };
  }

  async upsertProduct(
    tenantId: string,
    data: {
      id?: string;
      sku: string;
      name: string;
      description: string;
      category: ProductCategory;
      priceCents: number;
      stock: number;
      imageEmoji?: string;
      featured?: boolean;
      isActive?: boolean;
      requiresLicense?: boolean;
    },
  ) {
    if (data.priceCents < 0 || data.stock < 0) {
      throw new BadRequestException('Invalid price or stock');
    }

    const payload = {
      sku: data.sku.trim().toUpperCase(),
      name: data.name.trim(),
      description: data.description.trim(),
      category: data.category,
      priceCents: data.priceCents,
      stock: data.stock,
      imageEmoji: data.imageEmoji ?? '🛡️',
      featured: data.featured ?? false,
      isActive: data.isActive ?? true,
      requiresLicense: data.requiresLicense ?? false,
    };

    const product = data.id
      ? await this.prisma.product.update({
          where: { id: data.id },
          data: payload,
        })
      : await this.prisma.product.create({
          data: { tenantId, ...payload },
        });

    return {
      success: true,
      data: { ...product, priceFormatted: money(product.priceCents) },
    };
  }

  async placeOrder(
    tenantSlug: string | undefined,
    input: {
      customerName: string;
      customerEmail: string;
      customerPhone?: string;
      shippingAddress: string;
      notes?: string;
      items: { productId: string; quantity: number }[];
      customerUserId?: string;
      salesUserId?: string;
      discountCode?: string;
    },
  ) {
    if (!input.items?.length) {
      throw new BadRequestException('Cart is empty');
    }

    const tenantId = await this.resolveTenantId(tenantSlug);
    const productIds = input.items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { tenantId, id: { in: productIds }, isActive: true },
    });

    if (products.length !== productIds.length) {
      throw new BadRequestException('One or more products are unavailable');
    }

    const byId = new Map(products.map((p) => [p.id, p]));
    let subtotal = 0;
    const lines: {
      productId: string;
      productName: string;
      unitPriceCents: number;
      quantity: number;
      lineTotalCents: number;
    }[] = [];

    for (const item of input.items) {
      const product = byId.get(item.productId)!;
      if (item.quantity < 1) {
        throw new BadRequestException('Invalid quantity');
      }
      if (product.stock < item.quantity) {
        throw new BadRequestException(`Insufficient stock for ${product.name}`);
      }
      const lineTotal = product.priceCents * item.quantity;
      subtotal += lineTotal;
      lines.push({
        productId: product.id,
        productName: product.name,
        unitPriceCents: product.priceCents,
        quantity: item.quantity,
        lineTotalCents: lineTotal,
      });
    }

    let totalCents = subtotal;
    let discountCents = 0;
    let discountPercent = 0;
    let discountCode: string | null = null;
    let loyaltyPointsEarned = 0;

    if (input.customerUserId) {
      const quote = await this.loyalty.quoteStoreTotal(
        input.customerUserId,
        subtotal,
        input.discountCode,
      );
      totalCents = quote.finalCents;
      discountCents = quote.discountCents;
      discountPercent = quote.percent;
      discountCode = quote.discountCode;
      loyaltyPointsEarned = quote.loyaltyPointsEarned;
    }

    const orderNumber = `GEAR-${Date.now().toString(36).toUpperCase()}`;

    const order = await this.prisma.$transaction(async (tx) => {
      for (const line of lines) {
        await tx.product.update({
          where: { id: line.productId },
          data: { stock: { decrement: line.quantity } },
        });
      }

      return tx.storeOrder.create({
        data: {
          tenantId,
          orderNumber,
          customerUserId: input.customerUserId,
          customerName: input.customerName.trim(),
          customerEmail: input.customerEmail.trim().toLowerCase(),
          customerPhone: input.customerPhone?.trim(),
          shippingAddress: input.shippingAddress.trim(),
          notes: input.notes?.trim(),
          salesUserId: input.salesUserId,
          status: StoreOrderStatus.PAID,
          subtotalCents: subtotal,
          totalCents,
          discountCents,
          discountPercent,
          discountCode,
          loyaltyPointsEarned,
          items: { create: lines },
        },
        include: { items: true },
      });
    });

    if (input.customerUserId && totalCents > 0) {
      await this.loyalty.awardSpend(
        input.customerUserId,
        tenantId,
        totalCents,
        `Store order ${orderNumber}`,
      );
      if (discountCode) {
        await this.loyalty.incrementPromoUse(tenantId, discountCode);
      }
    }

    // Auto-create a sales lead for store orders when no sales owner yet
    if (!input.salesUserId) {
      await this.prisma.salesLead.create({
        data: {
          tenantId,
          contactName: input.customerName.trim(),
          contactEmail: input.customerEmail.trim().toLowerCase(),
          contactPhone: input.customerPhone?.trim(),
          source: 'Store Order',
          status: SalesLeadStatus.NEW,
          interest: lines.map((l) => l.productName).join(', '),
          estimatedCents: totalCents,
          notes: `Auto-created from order ${orderNumber}`,
        },
      });
    }

    return {
      success: true,
      data: {
        ...order,
        totalFormatted: money(order.totalCents),
        subtotalFormatted: money(order.subtotalCents),
        discountFormatted: money(order.discountCents),
      },
    };
  }

  async listOrdersForCustomer(tenantId: string, customerUserId: string) {
    const orders = await this.prisma.storeOrder.findMany({
      where: { tenantId, customerUserId },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return {
      success: true,
      data: orders.map((o) => ({
        ...o,
        totalFormatted: money(o.totalCents),
        subtotalFormatted: money(o.subtotalCents),
      })),
    };
  }

  async listOrders(tenantId: string, status?: StoreOrderStatus, viewerRole?: UserRole) {
    const orders = await this.prisma.storeOrder.findMany({
      where: { tenantId, ...(status ? { status } : {}) },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const showMoney = await this.canSeeRevenue(tenantId, viewerRole);

    const stats = {
      total: orders.length,
      pending: orders.filter((o) =>
        ['PENDING', 'PAID', 'PROCESSING'].includes(o.status),
      ).length,
      revenueCents: showMoney
        ? orders
            .filter((o) => o.status !== 'CANCELLED')
            .reduce((sum, o) => sum + o.totalCents, 0)
        : null,
    };

    return {
      success: true,
      data: orders.map((o) => ({
        ...o,
        totalCents: showMoney ? o.totalCents : null,
        subtotalCents: showMoney ? o.subtotalCents : null,
        totalFormatted: this.moneyOrHidden(o.totalCents, showMoney),
        subtotalFormatted: this.moneyOrHidden(o.subtotalCents, showMoney),
      })),
      stats: {
        ...stats,
        revenueFormatted:
          stats.revenueCents == null
            ? REVENUE_HIDDEN_LABEL
            : money(stats.revenueCents),
      },
    };
  }

  async updateOrderStatus(
    tenantId: string,
    orderId: string,
    status: StoreOrderStatus,
  ) {
    const order = await this.prisma.storeOrder.findFirst({
      where: { id: orderId, tenantId },
    });
    if (!order) throw new NotFoundException('Order not found');

    const updated = await this.prisma.storeOrder.update({
      where: { id: orderId },
      data: { status },
      include: { items: true },
    });

    return {
      success: true,
      data: {
        ...updated,
        totalFormatted: money(updated.totalCents),
      },
    };
  }

  async salesDashboard(tenantId: string, salesUserId?: string, viewerRole?: UserRole) {
    const leadWhere = {
      tenantId,
      ...(salesUserId ? { ownerUserId: salesUserId } : {}),
    };

    const [leads, orders, products] = await Promise.all([
      this.prisma.salesLead.findMany({
        where: leadWhere,
        include: {
          owner: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.storeOrder.findMany({
        where: {
          tenantId,
          ...(salesUserId ? { salesUserId } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      this.prisma.product.count({ where: { tenantId, isActive: true } }),
    ]);

    const showMoney = await this.canSeeRevenue(tenantId, viewerRole);

    const pipeline = {
      new: leads.filter((l) => l.status === 'NEW').length,
      contacted: leads.filter((l) => l.status === 'CONTACTED').length,
      qualified: leads.filter((l) => l.status === 'QUALIFIED').length,
      quoted: leads.filter((l) => l.status === 'QUOTED').length,
      won: leads.filter((l) => l.status === 'WON').length,
      lost: leads.filter((l) => l.status === 'LOST').length,
    };

    const estimatedPipelineCents = leads
      .filter((l) => !['WON', 'LOST'].includes(l.status))
      .reduce((sum, l) => sum + (l.estimatedCents ?? 0), 0);

    const wonCents = leads
      .filter((l) => l.status === 'WON')
      .reduce((sum, l) => sum + (l.estimatedCents ?? 0), 0);

    return {
      success: true,
      data: {
        stats: {
          openLeads: leads.filter((l) => !['WON', 'LOST'].includes(l.status))
            .length,
          wonDeals: pipeline.won,
          pipelineFormatted: this.moneyOrHidden(estimatedPipelineCents, showMoney),
          wonFormatted: this.moneyOrHidden(wonCents, showMoney),
          orders: orders.length,
          catalogSize: products,
          pipeline,
        },
        leads: leads.map((l) => ({
          ...l,
          estimatedCents: showMoney ? l.estimatedCents : null,
          estimatedFormatted: l.estimatedCents
            ? this.moneyOrHidden(l.estimatedCents, showMoney)
            : null,
          ownerName: l.owner
            ? `${l.owner.firstName} ${l.owner.lastName}`
            : 'Unassigned',
        })),
        recentOrders: orders.map((o) => ({
          ...o,
          totalCents: showMoney ? o.totalCents : null,
          totalFormatted: this.moneyOrHidden(o.totalCents, showMoney),
        })),
      },
    };
  }

  async upsertLead(
    tenantId: string,
    data: {
      id?: string;
      ownerUserId?: string | null;
      companyName?: string;
      contactName: string;
      contactEmail?: string;
      contactPhone?: string;
      source?: string;
      status?: SalesLeadStatus;
      interest?: string;
      estimatedCents?: number;
      notes?: string;
      nextFollowUp?: string | null;
    },
  ) {
    const payload = {
      ownerUserId: data.ownerUserId ?? null,
      companyName: data.companyName?.trim() || null,
      contactName: data.contactName.trim(),
      contactEmail: data.contactEmail?.trim().toLowerCase() || null,
      contactPhone: data.contactPhone?.trim() || null,
      source: data.source?.trim() || 'Manual',
      status: data.status ?? SalesLeadStatus.NEW,
      interest: data.interest?.trim() || null,
      estimatedCents: data.estimatedCents ?? null,
      notes: data.notes?.trim() || null,
      nextFollowUp: data.nextFollowUp ? new Date(data.nextFollowUp) : null,
    };

    const lead = data.id
      ? await this.prisma.salesLead.update({
          where: { id: data.id },
          data: payload,
          include: {
            owner: { select: { id: true, firstName: true, lastName: true } },
          },
        })
      : await this.prisma.salesLead.create({
          data: { tenantId, ...payload },
          include: {
            owner: { select: { id: true, firstName: true, lastName: true } },
          },
        });

    return {
      success: true,
      data: {
        ...lead,
        estimatedFormatted: lead.estimatedCents
          ? money(lead.estimatedCents)
          : null,
        ownerName: lead.owner
          ? `${lead.owner.firstName} ${lead.owner.lastName}`
          : 'Unassigned',
      },
    };
  }

  async listSalesUsers(tenantId: string) {
    const users = await this.prisma.user.findMany({
      where: {
        tenantId,
        status: 'ACTIVE',
        role: { in: [UserRole.SALES, UserRole.OWNER, UserRole.MANAGER] },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        jobTitle: true,
      },
      orderBy: { firstName: 'asc' },
    });
    return { success: true, data: users };
  }

  async listInstallJobs(tenantId: string, technicianId?: string) {
    const jobs = await this.prisma.installJob.findMany({
      where: {
        tenantId,
        ...(technicianId ? { technicianId } : {}),
      },
      include: {
        technician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            jobTitle: true,
            phone: true,
          },
        },
      },
      orderBy: { scheduledAt: 'asc' },
    });

    return {
      success: true,
      data: jobs.map((j) => ({
        ...j,
        technicianName: j.technician
          ? `${j.technician.firstName} ${j.technician.lastName}`
          : 'Unassigned',
      })),
      stats: {
        scheduled: jobs.filter((j) => j.status === 'SCHEDULED').length,
        inProgress: jobs.filter((j) =>
          ['EN_ROUTE', 'IN_PROGRESS'].includes(j.status),
        ).length,
        completed: jobs.filter((j) => j.status === 'COMPLETED').length,
      },
    };
  }

  async updateInstallJobStatus(
    tenantId: string,
    jobId: string,
    status: InstallJobStatus,
    technicianId?: string,
  ) {
    const job = await this.prisma.installJob.findFirst({
      where: {
        id: jobId,
        tenantId,
        ...(technicianId ? { technicianId } : {}),
      },
    });
    if (!job) throw new NotFoundException('Install job not found');

    const updated = await this.prisma.installJob.update({
      where: { id: jobId },
      data: {
        status,
        completedAt: status === 'COMPLETED' ? new Date() : job.completedAt,
      },
      include: {
        technician: {
          select: { id: true, firstName: true, lastName: true, jobTitle: true },
        },
      },
    });

    return {
      success: true,
      data: {
        ...updated,
        technicianName: updated.technician
          ? `${updated.technician.firstName} ${updated.technician.lastName}`
          : 'Unassigned',
      },
    };
  }

  async upsertInstallJob(
    tenantId: string,
    data: {
      id?: string;
      technicianId?: string | null;
      title: string;
      description?: string;
      jobType: string;
      status?: InstallJobStatus;
      clientName: string;
      clientPhone?: string;
      address: string;
      scheduledAt: string;
      equipmentNotes?: string;
    },
  ) {
    const payload = {
      technicianId: data.technicianId ?? null,
      title: data.title.trim(),
      description: data.description?.trim() || null,
      jobType: data.jobType.trim(),
      status: data.status ?? InstallJobStatus.SCHEDULED,
      clientName: data.clientName.trim(),
      clientPhone: data.clientPhone?.trim() || null,
      address: data.address.trim(),
      scheduledAt: new Date(data.scheduledAt),
      equipmentNotes: data.equipmentNotes?.trim() || null,
    };

    const job = data.id
      ? await this.prisma.installJob.update({
          where: { id: data.id },
          data: payload,
          include: {
            technician: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        })
      : await this.prisma.installJob.create({
          data: { tenantId, ...payload },
          include: {
            technician: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        });

    return {
      success: true,
      data: {
        ...job,
        technicianName: job.technician
          ? `${job.technician.firstName} ${job.technician.lastName}`
          : 'Unassigned',
      },
    };
  }

  async technicianProfile(userId: string, tenantId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId, role: UserRole.TECHNICIAN },
      include: {
        teamMemberships: {
          include: { team: { select: { id: true, name: true } } },
        },
        branch: { select: { id: true, name: true, code: true } },
      },
    });
    if (!user) throw new NotFoundException('Technician not found');

    const jobs = await this.prisma.installJob.findMany({
      where: { technicianId: userId },
      orderBy: { scheduledAt: 'asc' },
    });

    return {
      success: true,
      data: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        jobTitle: user.jobTitle,
        avatarUrl: user.avatarUrl,
        branch: user.branch,
        teams: user.teamMemberships.map((m) => ({
          id: m.team.id,
          name: m.team.name,
          isLead: m.isLead,
        })),
        stats: {
          scheduled: jobs.filter((j) => j.status === 'SCHEDULED').length,
          active: jobs.filter((j) =>
            ['EN_ROUTE', 'IN_PROGRESS'].includes(j.status),
          ).length,
          completed: jobs.filter((j) => j.status === 'COMPLETED').length,
        },
        jobs,
      },
    };
  }

  async listTechnicians(tenantId: string) {
    const techs = await this.prisma.user.findMany({
      where: { tenantId, role: UserRole.TECHNICIAN, status: 'ACTIVE' },
      include: {
        teamMemberships: {
          include: { team: { select: { id: true, name: true } } },
        },
        branch: { select: { name: true, code: true } },
      },
      orderBy: { firstName: 'asc' },
    });

    return {
      success: true,
      data: techs.map((t) => ({
        id: t.id,
        email: t.email,
        firstName: t.firstName,
        lastName: t.lastName,
        phone: t.phone,
        jobTitle: t.jobTitle,
        branch: t.branch,
        teams: t.teamMemberships.map((m) => m.team.name),
      })),
    };
  }

  async technicianTeam(userId: string, tenantId: string) {
    const membership = await this.prisma.teamMember.findFirst({
      where: { userId, team: { tenantId, isActive: true } },
      include: {
        team: {
          include: {
            branch: { select: { id: true, name: true, code: true } },
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    phone: true,
                    jobTitle: true,
                    avatarUrl: true,
                    status: true,
                  },
                },
              },
              orderBy: [{ isLead: 'desc' }, { joinedAt: 'asc' }],
            },
          },
        },
      },
    });

    if (!membership) {
      return { success: true, data: null };
    }

    const memberIds = membership.team.members.map((m) => m.userId);
    const openJobs = await this.prisma.installJob.findMany({
      where: {
        tenantId,
        technicianId: { in: memberIds },
        status: { in: ['SCHEDULED', 'EN_ROUTE', 'IN_PROGRESS'] },
      },
      select: { technicianId: true, status: true },
    });

    return {
      success: true,
      data: {
        id: membership.team.id,
        name: membership.team.name,
        branch: membership.team.branch,
        myRole: membership.isLead ? 'LEAD' : 'MEMBER',
        members: membership.team.members.map((m) => {
          const jobs = openJobs.filter((j) => j.technicianId === m.userId);
          return {
            id: m.user.id,
            firstName: m.user.firstName,
            lastName: m.user.lastName,
            email: m.user.email,
            phone: m.user.phone,
            jobTitle: m.user.jobTitle,
            avatarUrl: m.user.avatarUrl,
            isLead: m.isLead,
            isMe: m.userId === userId,
            openJobs: jobs.length,
            statusLabel: jobs.some((j) => j.status === 'IN_PROGRESS' || j.status === 'EN_ROUTE')
              ? 'On job'
              : jobs.length
                ? 'Scheduled'
                : 'Available',
          };
        }),
      },
    };
  }

  async listTechInventory(tenantId: string) {
    const products = await this.prisma.product.findMany({
      where: {
        tenantId,
        isActive: true,
        category: { in: [ProductCategory.CCTV, ProductCategory.GEAR, ProductCategory.ACCESSORIES] },
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    return {
      success: true,
      data: products.map((p) => ({
        id: p.id,
        sku: p.sku,
        name: p.name,
        description: p.description,
        category: p.category,
        stock: p.stock,
        imageEmoji: p.imageEmoji,
        lowStock: p.stock <= 5,
        priceFormatted: money(p.priceCents),
      })),
    };
  }

  async listTechStockRequests(tenantId: string, requesterId: string) {
    const rows = await this.prisma.stockRequest.findMany({
      where: { tenantId, requesterId },
      include: {
        product: { select: { id: true, name: true, sku: true, imageEmoji: true, category: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return {
      success: true,
      data: rows.map((r) => ({
        id: r.id,
        quantity: r.quantity,
        status: r.status,
        notes: r.notes,
        createdAt: r.createdAt,
        fulfilledAt: r.fulfilledAt,
        product: r.product,
      })),
    };
  }

  async createStockRequest(
    tenantId: string,
    requesterId: string,
    body: { productId: string; quantity: number; notes?: string },
  ) {
    if (!body.productId) throw new BadRequestException('Select a product');
    const qty = Math.floor(Number(body.quantity));
    if (!Number.isFinite(qty) || qty < 1) throw new BadRequestException('Quantity must be at least 1');

    const product = await this.prisma.product.findFirst({
      where: { id: body.productId, tenantId, isActive: true },
    });
    if (!product) throw new NotFoundException('Product not found');

    const created = await this.prisma.stockRequest.create({
      data: {
        tenantId,
        requesterId,
        productId: product.id,
        quantity: qty,
        notes: body.notes?.trim() || null,
        status: StockRequestStatus.PENDING,
      },
      include: {
        product: { select: { id: true, name: true, sku: true, imageEmoji: true, category: true } },
      },
    });

    return {
      success: true,
      data: {
        id: created.id,
        quantity: created.quantity,
        status: created.status,
        notes: created.notes,
        createdAt: created.createdAt,
        product: created.product,
      },
    };
  }

  async listAdminStockRequests(tenantId: string) {
    const rows = await this.prisma.stockRequest.findMany({
      where: { tenantId },
      include: {
        product: { select: { id: true, name: true, sku: true, stock: true, imageEmoji: true } },
        requester: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      take: 100,
    });
    return {
      success: true,
      data: rows.map((r) => ({
        id: r.id,
        quantity: r.quantity,
        status: r.status,
        notes: r.notes,
        createdAt: r.createdAt,
        product: r.product,
        requester: {
          id: r.requester.id,
          name: `${r.requester.firstName} ${r.requester.lastName}`.trim(),
          email: r.requester.email,
        },
      })),
    };
  }

  async updateStockRequestStatus(
    tenantId: string,
    requestId: string,
    reviewerId: string,
    status: StockRequestStatus,
  ) {
    const allowed: StockRequestStatus[] = [
      StockRequestStatus.APPROVED,
      StockRequestStatus.FULFILLED,
      StockRequestStatus.REJECTED,
      StockRequestStatus.PENDING,
    ];
    if (!allowed.includes(status)) throw new BadRequestException('Invalid status');

    const existing = await this.prisma.stockRequest.findFirst({
      where: { id: requestId, tenantId },
      include: { product: true },
    });
    if (!existing) throw new NotFoundException('Request not found');

    if (status === StockRequestStatus.FULFILLED) {
      if (existing.product.stock < existing.quantity) {
        throw new BadRequestException(
          `Insufficient stock (${existing.product.stock} available, ${existing.quantity} requested)`,
        );
      }
      const updated = await this.prisma.$transaction(async (tx) => {
        await tx.product.update({
          where: { id: existing.productId },
          data: { stock: { decrement: existing.quantity } },
        });
        return tx.stockRequest.update({
          where: { id: requestId },
          data: {
            status: StockRequestStatus.FULFILLED,
            reviewedById: reviewerId,
            fulfilledAt: new Date(),
          },
          include: {
            product: { select: { id: true, name: true, sku: true, stock: true } },
            requester: { select: { firstName: true, lastName: true } },
          },
        });
      });
      return { success: true, data: updated };
    }

    const updated = await this.prisma.stockRequest.update({
      where: { id: requestId },
      data: {
        status,
        reviewedById: reviewerId,
        fulfilledAt: null,
      },
      include: {
        product: { select: { id: true, name: true, sku: true, stock: true } },
        requester: { select: { firstName: true, lastName: true } },
      },
    });
    return { success: true, data: updated };
  }

  async ownerStoreOverview(tenantId: string, viewerRole?: UserRole) {
    const [products, orders, leads, techs, jobs] = await Promise.all([
      this.prisma.product.findMany({ where: { tenantId } }),
      this.prisma.storeOrder.findMany({
        where: { tenantId },
        include: { items: true },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      this.prisma.salesLead.count({
        where: { tenantId, status: { notIn: ['WON', 'LOST'] } },
      }),
      this.prisma.user.count({
        where: { tenantId, role: UserRole.TECHNICIAN, status: 'ACTIVE' },
      }),
      this.prisma.installJob.count({
        where: {
          tenantId,
          status: { in: ['SCHEDULED', 'EN_ROUTE', 'IN_PROGRESS'] },
        },
      }),
    ]);

    const showMoney = await this.canSeeRevenue(tenantId, viewerRole);

    const revenueCents = orders
      .filter((o) => o.status !== 'CANCELLED')
      .reduce((sum, o) => sum + o.totalCents, 0);

    const lowStock = products.filter((p) => p.isActive && p.stock <= 5);

    return {
      success: true,
      data: {
        stats: {
          catalogSize: products.filter((p) => p.isActive).length,
          lowStock: lowStock.length,
          openOrders: orders.filter((o) =>
            ['PENDING', 'PAID', 'PROCESSING', 'SHIPPED'].includes(o.status),
          ).length,
          revenueFormatted: this.moneyOrHidden(revenueCents, showMoney),
          openLeads: leads,
          technicians: techs,
          activeInstalls: jobs,
        },
        lowStock: lowStock.map((p) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          stock: p.stock,
          category: p.category,
        })),
        recentOrders: orders.map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          customerName: o.customerName,
          status: o.status,
          totalFormatted: money(o.totalCents),
          createdAt: o.createdAt,
          itemCount: o.items.length,
        })),
      },
    };
  }
}
