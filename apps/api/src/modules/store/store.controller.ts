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
    @Body() body: { status: InstallJobStatus | string; overrideReason?: string },
  ) {
    return this.store.updateInstallJobStatus(
      user.tenantId,
      id,
      body.status,
      user.id,
      body.overrideReason,
    );
  }

  @Patch('tech/jobs/:id/tests')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TECHNICIAN)
  techJobTests(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { tests: Array<{ id: string; label: string; done: boolean }> },
  ) {
    return this.store.updateInstallJobChecklist(
      user.tenantId,
      id,
      user.id,
      body?.tests ?? [],
    );
  }

  @Patch('tech/jobs/:id/serial')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TECHNICIAN)
  techJobSerial(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { serial: string },
  ) {
    return this.store.updateInstallJobSerial(
      user.tenantId,
      id,
      user.id,
      body?.serial ?? '',
    );
  }

  @Get('tech/properties')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TECHNICIAN)
  techProperties(@CurrentUser() user: AuthUser) {
    return this.surveillance.listTenantPropertiesForTech(user.tenantId);
  }

  @Get('tech/cctv-systems')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TECHNICIAN)
  techCctvSystems(@CurrentUser() user: AuthUser) {
    return this.surveillance.listCctvSystems(user.tenantId);
  }

  @Post('tech/cctv-systems')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TECHNICIAN)
  techRegisterCctvSystem(
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      propertyId?: string;
      clientUserId?: string;
      site?: {
        name: string;
        address: string;
        propertyType?: string;
        accessNotes?: string;
        gateCode?: string;
      };
      system: {
        name: string;
        brand?: string;
        model?: string;
        kitSku?: string;
        supplier?: string;
        recorderType?: string;
        channelCount?: number;
        connectivity?: string;
        recorderSerial?: string;
        recorderIp?: string;
        cloudId?: string;
        hddInstalled?: boolean;
        hddSerial?: string;
        hddCapacityGb?: number;
        firmware?: string;
        mobileAppEnabled?: boolean;
        techNotes?: string;
        status?: string;
      };
      cameras?: Array<{
        name: string;
        locationLabel: string;
        channel?: number;
        serialNumber?: string;
        model?: string;
        resolution?: string;
        placement?: 'EXTERIOR' | 'INTERIOR';
        vendor?: string;
      }>;
    },
  ) {
    return this.surveillance.registerCctvSystem(user.tenantId, body);
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
        placement?: 'EXTERIOR' | 'INTERIOR';
        serialNumber?: string;
        model?: string;
        resolution?: string;
        systemId?: string;
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
