import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  InstallJobStatus,
  ProductCategory,
  SalesLeadStatus,
  StockRequestStatus,
  StoreOrderStatus,
  UserRole,
} from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  STORE_ADMIN_ROLES,
} from '../../common/developer-access';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SurveillanceService } from '../surveillance/surveillance.service';
import { StoreService } from './store.service';

type AuthUser = { id: string; tenantId: string; role: UserRole };

const STORE_ADMIN: UserRole[] = STORE_ADMIN_ROLES;

const SALES_ROLES: UserRole[] = [
  ...STORE_ADMIN,
  UserRole.SALES,
];

const TECH_ADMIN: UserRole[] = [...STORE_ADMIN, UserRole.SUPERVISOR];

@Controller('store')
export class StoreController {
  constructor(
    private readonly store: StoreService,
    private readonly surveillance: SurveillanceService,
  ) {}

  /** Public catalog */
  @Get('catalog')
  catalog(
    @Query('tenant') tenant?: string,
    @Query('category') category?: ProductCategory,
    @Query('featured') featured?: string,
  ) {
    return this.store.listProducts({
      tenantSlug: tenant,
      category,
      featuredOnly: featured === '1' || featured === 'true',
    });
  }

  @Get('catalog/:id')
  product(@Param('id') id: string, @Query('tenant') tenant?: string) {
    return this.store.getProduct(id, tenant);
  }

  @Post('checkout')
  checkout(
    @Body()
    body: {
      tenantSlug?: string;
      customerName: string;
      customerEmail: string;
      customerPhone?: string;
      shippingAddress: string;
      notes?: string;
      customerUserId?: string;
      discountCode?: string;
      items: { productId: string; quantity: number }[];
    },
  ) {
    return this.store.placeOrder(body.tenantSlug, body);
  }

  /** Active client — orders linked to their account */
  @Get('my-orders')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER, UserRole.FAMILY_MEMBER)
  myOrders(@CurrentUser() user: AuthUser) {
    return this.store.listOrdersForCustomer(user.tenantId, user.id);
  }

  /** Owner / manager store CRM */
  @Get('admin/overview')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...STORE_ADMIN)
  overview(@CurrentUser() user: AuthUser) {
    return this.store.ownerStoreOverview(user.tenantId, user.role);
  }

  @Get('admin/products')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...STORE_ADMIN, UserRole.SALES)
  adminProducts(@CurrentUser() user: AuthUser) {
    return this.store.listProducts({
      tenantId: user.tenantId,
      includeInactive: true,
    });
  }

  @Post('admin/products')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...STORE_ADMIN)
  upsertProduct(
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
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
    return this.store.upsertProduct(user.tenantId, body);
  }

  @Get('admin/orders')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...SALES_ROLES)
  orders(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: StoreOrderStatus,
  ) {
    return this.store.listOrders(user.tenantId, status, user.role);
  }

  @Patch('admin/orders/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...STORE_ADMIN, UserRole.SALES)
  orderStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { status: StoreOrderStatus },
  ) {
    return this.store.updateOrderStatus(user.tenantId, id, body.status);
  }

  /** Sales CRM */
  @Get('sales/dashboard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...SALES_ROLES)
  salesDashboard(@CurrentUser() user: AuthUser) {
    const scoped =
      user.role === UserRole.SALES ? user.id : undefined;
    return this.store.salesDashboard(user.tenantId, scoped, user.role);
  }

  @Get('sales/users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...SALES_ROLES)
  salesUsers(@CurrentUser() user: AuthUser) {
    return this.store.listSalesUsers(user.tenantId);
  }

  @Post('sales/leads')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...SALES_ROLES)
  upsertLead(
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
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
    const ownerUserId =
      user.role === UserRole.SALES && !body.ownerUserId
        ? user.id
        : body.ownerUserId;
    return this.store.upsertLead(user.tenantId, { ...body, ownerUserId });
  }

  /** Install / technician jobs (control room) */
  @Get('installs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...TECH_ADMIN, UserRole.SALES)
  installs(@CurrentUser() user: AuthUser) {
    return this.store.listInstallJobs(user.tenantId);
  }

  @Post('installs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...TECH_ADMIN)
  upsertInstall(
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
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
    return this.store.upsertInstallJob(user.tenantId, body);
  }

  @Get('technicians')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...TECH_ADMIN, UserRole.SALES)
  technicians(@CurrentUser() user: AuthUser) {
    return this.store.listTechnicians(user.tenantId);
  }

  /** Technician portal */
  @Get('tech/me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TECHNICIAN)
  techProfile(@CurrentUser() user: AuthUser) {
    return this.store.technicianProfile(user.id, user.tenantId);
  }

  @Get('tech/jobs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TECHNICIAN)
  techJobs(@CurrentUser() user: AuthUser) {
    return this.store.listInstallJobs(user.tenantId, user.id);
  }

  @Patch('tech/jobs/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TECHNICIAN)
  techJobStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { status: InstallJobStatus },
  ) {
    return this.store.updateInstallJobStatus(
      user.tenantId,
      id,
      body.status,
      user.id,
    );
  }

  @Get('tech/properties')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TECHNICIAN)
  techProperties(@CurrentUser() user: AuthUser) {
    return this.surveillance.listTenantPropertiesForTech(user.tenantId);
  }

  @Post('tech/properties/:id/cameras')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TECHNICIAN)
  techCommissionCameras(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body()
    body: {
      cameras: {
        name: string;
        locationLabel: string;
        channel?: number;
        vendor?: string;
      }[];
    },
  ) {
    return this.surveillance.techCommissionCameras(
      user.tenantId,
      id,
      body?.cameras ?? [],
    );
  }

  @Get('tech/team')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TECHNICIAN)
  techTeam(@CurrentUser() user: AuthUser) {
    return this.store.technicianTeam(user.id, user.tenantId);
  }

  @Get('tech/inventory')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TECHNICIAN)
  techInventory(@CurrentUser() user: AuthUser) {
    return this.store.listTechInventory(user.tenantId);
  }

  @Get('tech/stock-requests')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TECHNICIAN)
  techStockRequests(@CurrentUser() user: AuthUser) {
    return this.store.listTechStockRequests(user.tenantId, user.id);
  }

  @Post('tech/stock-requests')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TECHNICIAN)
  createTechStockRequest(
    @CurrentUser() user: AuthUser,
    @Body() body: { productId: string; quantity: number; notes?: string },
  ) {
    return this.store.createStockRequest(user.tenantId, user.id, body);
  }

  @Get('admin/stock-requests')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...TECH_ADMIN)
  adminStockRequests(@CurrentUser() user: AuthUser) {
    return this.store.listAdminStockRequests(user.tenantId);
  }

  @Patch('admin/stock-requests/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...TECH_ADMIN)
  updateAdminStockRequest(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { status: StockRequestStatus },
  ) {
    return this.store.updateStockRequestStatus(
      user.tenantId,
      id,
      user.id,
      body.status,
    );
  }
}
