import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { LeadsService } from './leads.service';
import { CustomersService } from './customers.service';
import { DealsService } from './deals.service';
import { ActivitiesService } from './activities.service';
import { RequirePermissions } from '../rbac/permissions.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuditService } from '../audit/audit.service';
import {
  CreateActivityDto,
  CreateDeviceDto,
  CreateCustomerDto,
  CreateDealDto,
  CreatePropertyDto,
  UpdateCustomerDto,
  UpdateDealDto,
  UpdateLeadDto,
} from './dto/crm.dto';

@ApiTags('crm')
@ApiBearerAuth()
@Controller({ path: 'admin/crm', version: '1' })
export class CrmController {
  constructor(
    private readonly leads: LeadsService,
    private readonly customers: CustomersService,
    private readonly deals: DealsService,
    private readonly activities: ActivitiesService,
    private readonly audit: AuditService,
  ) {}

  // ---------- Leads ----------

  @Get('leads')
  @RequirePermissions('leads.read')
  listLeads(
    @Query('page') page = '1',
    @Query('page_size') pageSize = '20',
    @Query('status') status?: string,
    @Query('source') source?: string,
    @Query('q') q?: string,
    @Query('assigned_to_id') assignedToId?: string,
  ) {
    return this.leads.list({
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 20,
      status,
      source,
      q,
      assignedToId,
    });
  }

  @Get('leads/:id')
  @RequirePermissions('leads.read')
  getLead(@Param('id') id: string) {
    return this.leads.get(BigInt(id));
  }

  @Patch('leads/:id')
  @RequirePermissions('leads.write')
  updateLead(@Param('id') id: string, @Body() dto: UpdateLeadDto) {
    return this.leads.update(BigInt(id), {
      status: dto.status,
      assignedToId: dto.assigned_to_id,
      score: dto.score,
      lostReason: dto.lost_reason,
    });
  }

  @Post('leads/:id/convert')
  @RequirePermissions('leads.write')
  async convertLead(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.leads.convert(BigInt(id));
    await this.audit.record({
      userId: user.id,
      action: 'convert',
      entity: 'leads',
      entityId: id,
      changes: { customer_uuid: result.customer_uuid },
    });
    return result;
  }

  // ---------- Customers ----------

  @Get('customers')
  @RequirePermissions('customers.read')
  listCustomers(
    @Query('page') page = '1',
    @Query('page_size') pageSize = '20',
    @Query('q') q?: string,
  ) {
    return this.customers.list({ page: Number(page) || 1, pageSize: Number(pageSize) || 20, q });
  }

  @Get('customers/:id')
  @RequirePermissions('customers.read')
  getCustomer(@Param('id') id: string) {
    return this.customers.get360(BigInt(id));
  }

  @Post('customers')
  @RequirePermissions('customers.write')
  async createCustomer(@Body() dto: CreateCustomerDto, @CurrentUser() user: AuthenticatedUser) {
    const c = await this.customers.create({
      email: dto.email,
      firstName: dto.first_name,
      lastName: dto.last_name,
      phone: dto.phone,
      locale: dto.locale,
    });
    await this.audit.record({
      userId: user.id,
      action: 'create',
      entity: 'customers',
      entityId: c.uuid,
    });
    return c;
  }

  @Patch('customers/:id')
  @RequirePermissions('customers.write')
  updateCustomer(@Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    return this.customers.update(BigInt(id), {
      firstName: dto.first_name,
      lastName: dto.last_name,
      phone: dto.phone,
      vipLevel: dto.vip_level,
    });
  }

  @Post('customers/:id/properties')
  @RequirePermissions('customers.write')
  addProperty(@Param('id') id: string, @Body() dto: CreatePropertyDto) {
    return this.customers.addProperty(BigInt(id), dto);
  }

  @Post('customers/:id/devices')
  @RequirePermissions('customers.write')
  addDevice(@Param('id') id: string, @Body() dto: CreateDeviceDto) {
    return this.customers.addDevice(BigInt(id), {
      model: dto.model,
      serialNumber: dto.serial_number,
      warrantyMonths: dto.warranty_months,
    });
  }

  // ---------- Deals (pipeline) ----------

  @Get('deals/board')
  @RequirePermissions('deals.read')
  board() {
    return this.deals.board();
  }

  @Post('deals')
  @RequirePermissions('deals.write')
  createDeal(@Body() dto: CreateDealDto, @CurrentUser() user: AuthenticatedUser) {
    return this.deals.create({
      customerId: BigInt(dto.customer_id),
      title: dto.title,
      amount: dto.amount,
      stage: dto.stage,
      ownerId: user.id,
    });
  }

  @Patch('deals/:id')
  @RequirePermissions('deals.write')
  updateDeal(@Param('id') id: string, @Body() dto: UpdateDealDto) {
    return this.deals.update(BigInt(id), { stage: dto.stage, title: dto.title, amount: dto.amount });
  }

  // ---------- Activities ----------

  @Post('activities')
  @RequirePermissions('customers.write')
  createActivity(@Body() dto: CreateActivityDto, @CurrentUser() user: AuthenticatedUser) {
    return this.activities.create({
      customerId: BigInt(dto.customer_id),
      type: dto.type,
      subject: dto.subject,
      body: dto.body,
      userId: user.id,
    });
  }
}
